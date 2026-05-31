// quadtree_mosaic.frag (v3: independent noise/variance levels, take min)
// 擬似四分木モザイク。ノイズマスクで分割粒度を局所制御。
//
// Inputs:
//   sTD2DInputs[0] : 元画像 (中点サンプリング用、mipmap不要)
//   sTD2DInputs[1] : ノイズマスク (.r を 0..1 として読む)
//   sTD2DInputs[2] : prep_variance 出力 (RGBA = mean(R),mean(G),mean(B),mean((R²+G²+B²)/3))
//                    consumer 側 inputfiltertype=mipmap で chain 自動生成。
//
// 分割の決定方針 (v3):
//   noiseLevel    = ノイズ画像から決まる「サイズ上限」レベル
//                   noise=0 → maxLevel (大ブロック)、noise=1 → minLevel (細)
//                   noiseInfluence で効きの強さを制御 (0でノイズ無視)
//   varianceLevel = 画像分散ベースの希望レベル
//                   maxLevel から降下し、分散 > baseThreshold なら 1段細かく
//   chosenLevel   = min(noiseLevel, varianceLevel)
//                   = どちらかが「もっと細かく」と言ったらそれに従う
//
// 高速化: mipmap level L の 1 read で分散を取得。全体で ~maxLevel reads/pixel。

uniform vec4 baseThreshold;     // .x = 分散しきい値 (0..1 color² space)
uniform vec4 noiseInfluence;    // .x = 0=ノイズ無視, 1=フルにノイズでサイズ規定
uniform vec4 minLevel;          // .x = 最小ブロック = 2^minLevel px
uniform vec4 maxLevel;          // .x = 最大ブロック = 2^maxLevel px
uniform vec4 showBlocks;        // .x = 線幅 (px). 0=非表示
uniform vec4 lineColor;         // .rgb = 線の色
uniform vec4 whiteOut;          // .x > 0.5 = ベース画像を白にして線だけ表示

out vec4 fragColor;

// Mipmap level L のブロック平均から分散を即座に計算。
//   .rgb = mean(R), mean(G), mean(B)
//   .a   = mean((R²+G²+B²)/3)
// 分散 = .a − dot(rgb, rgb) / 3
float blockVarianceFromPrep(vec2 centerUV, float lod) {
    vec4 stats = textureLod(sTD2DInputs[2], centerUV, lod);
    return max(0.0, stats.a - dot(stats.rgb, stats.rgb) / 3.0);
}

void main() {
    vec2 uv      = vUV.st;
    vec2 res     = uTDOutputInfo.res.zw;
    vec2 pxCoord = uv * res;

    int lvlMin = clamp(int(minLevel.x), 0, 12);
    int lvlMax = clamp(int(maxLevel.x), lvlMin, 12);

    // --- 1. ノイズ画像から noiseLevel を計算 ---------------------------
    // ノイズはこのピクセル位置 (UV) で読む。ブロック単位ではなくピクセル単位なので
    // ノイズグラデーションそのものを反映できる。
    float noise = textureLod(sTD2DInputs[1], uv, 0.0).r;
    float effNoise = clamp(noise * noiseInfluence.x, 0.0, 1.0);
    // noise=0 → noiseLevel = lvlMax、noise=1 → noiseLevel = lvlMin
    int noiseLevel = int(floor(mix(float(lvlMax), float(lvlMin), effNoise) + 0.5));
    noiseLevel = clamp(noiseLevel, lvlMin, lvlMax);

    // --- 2. 画像分散から varianceLevel を計算 (従来の降下ループ) -------
    int varianceLevel = lvlMin;
    for (int L = 12; L >= 0; --L) {
        if (L > lvlMax) continue;
        if (L < lvlMin) break;

        float size     = exp2(float(L));
        vec2  originPx = floor(pxCoord / size) * size;
        vec2  endPx    = min(originPx + size, res);
        vec2  centerUV = ((originPx + endPx) * 0.5) / res;

        if (L == lvlMin) { varianceLevel = L; break; }

        float v = blockVarianceFromPrep(centerUV, float(L));
        if (v > baseThreshold.x) {
            varianceLevel = L - 1;   // 分割する → 1段細かい
        } else {
            varianceLevel = L;        // ここに着地
            break;
        }
    }

    // --- 3. より細かい方を採用 ---------------------------------------
    int chosen = min(noiseLevel, varianceLevel);

    // --- 4. ブロックの中点で色サンプリング ---------------------------
    float size     = exp2(float(chosen));
    vec2  originPx = floor(pxCoord / size) * size;
    vec2  endPx    = min(originPx + size, res);
    vec2  centerUV = ((originPx + endPx) * 0.5) / res;
    vec3  midColor = textureLod(sTD2DInputs[0], centerUV, 0.0).rgb;

    vec3 baseColor = whiteOut.x > 0.5 ? vec3(1.0) : midColor;

    // --- 5. 線描画 ---------------------------------------------------
    float lineWidth = max(0.0, showBlocks.x);
    vec3 color = baseColor;
    if (lineWidth > 0.0) {
        vec2 local = pxCoord - originPx;
        bool onEdge = local.x < lineWidth || local.y < lineWidth ||
                      local.x >= size - lineWidth || local.y >= size - lineWidth;
        if (onEdge) color = lineColor.rgb;
    }

    fragColor = TDOutputSwizzle(vec4(color, 1.0));
}
