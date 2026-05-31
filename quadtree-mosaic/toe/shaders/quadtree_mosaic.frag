// quadtree_mosaic.frag (v2: mipmap-accelerated)
// 擬似四分木モザイク。ノイズマスクで分割粒度を局所制御。
//
// Inputs:
//   sTD2DInputs[0] : 元画像 (中点サンプリング用、mipmap不要)
//   sTD2DInputs[1] : ノイズマスク (.r を 0..1 として読む)
//   sTD2DInputs[2] : prep_variance 出力 (RGBA = mean(R),mean(G),mean(B),mean((R²+G²+B²)/3))
//                    Mipmap 自動生成 ON 必須
//
// 高速化方針 (v1 比 約16倍速):
//   v1: 各候補レベルでブロック内 N×N サンプル → 4×4×7 = 112 reads/pixel
//   v2: 各候補レベルで mipmap level L を 1 read で済ます → 7 reads/pixel
//   2048×2048 で 470M → 29M reads/frame、60fps 余裕。

uniform vec4 baseThreshold;     // .x = 分散しきい値 (0..1 color² space). default 0.04
uniform vec4 noiseInfluence;    // .x = 0=ノイズ無視, 1=フルハイブリッド. default 1
uniform vec4 minLevel;          // .x = 最小ブロック = 2^minLevel px.   default 1
uniform vec4 maxLevel;          // .x = 最大ブロック = 2^maxLevel px.   default 7
uniform vec4 showBlocks;        // .x = 線幅 (px). 0=非表示. default 0
uniform vec4 lineColor;         // .rgb = 線の色. default (0,0,0)=黒
uniform vec4 whiteOut;          // .x > 0.5 = ベース画像を白にして線だけ表示. default 0

out vec4 fragColor;

// Mipmap level L のブロック平均から分散を即座に計算。
//   .rgb = mean(R), mean(G), mean(B)
//   .a   = mean((R²+G²+B²)/3)
// 分散 = .a − (mean(R)² + mean(G)² + mean(B)²) / 3
//      = .a − dot(rgb, rgb) / 3
float blockVarianceFromPrep(vec2 centerUV, float lod) {
    vec4 stats = textureLod(sTD2DInputs[2], centerUV, lod);
    return max(0.0, stats.a - dot(stats.rgb, stats.rgb) / 3.0);
}

void main() {
    vec2 uv      = vUV.st;
    vec2 res     = uTDOutputInfo.res.zw;   // (W, H) in pixels
    vec2 pxCoord = uv * res;

    int lvlMin = clamp(int(minLevel.x), 0, 12);
    int lvlMax = clamp(int(maxLevel.x), lvlMin, 12);

    int chosen = lvlMin;
    for (int L = 12; L >= 0; --L) {
        if (L > lvlMax) continue;
        if (L < lvlMin) break;

        float size     = exp2(float(L));
        vec2  originPx = floor(pxCoord / size) * size;
        // ブロックが画像端からはみ出る場合、中点が画像外を指して
        // mipmap が undefined 値 (典型的には黒) を返す問題を防ぐ。
        // 「ブロックと画像が重なる領域」の中央をサンプル位置にする。
        vec2  endPx    = min(originPx + size, res);
        vec2  centerUV = ((originPx + endPx) * 0.5) / res;

        // Mipmap level L はブロックサイズ 2^L に対応 (textureLod は LOD を float で取る)。
        float lod      = float(L);

        float noise     = textureLod(sTD2DInputs[1], centerUV, 0.0).r;
        float threshLoc = baseThreshold.x *
                          mix(1.0, max(0.0, 1.0 - noise), noiseInfluence.x);

        if (L == lvlMin) { chosen = L; break; }

        float v = blockVarianceFromPrep(centerUV, lod);
        if (v > threshLoc) {
            chosen = L - 1;
        } else {
            chosen = L;
            break;
        }
    }

    // 中点サンプリングは元画像から直接 (mip 0)。
    // ブロックが画像端からはみ出る場合は、ブロックと画像の重なり領域の中央。
    float size     = exp2(float(chosen));
    vec2  originPx = floor(pxCoord / size) * size;
    vec2  endPx    = min(originPx + size, res);
    vec2  centerUV = ((originPx + endPx) * 0.5) / res;
    vec3  midColor = textureLod(sTD2DInputs[0], centerUV, 0.0).rgb;

    // ベース色: whiteOut が ON ならベース画像を白に置換。
    vec3 baseColor = whiteOut.x > 0.5 ? vec3(1.0) : midColor;

    // 線の描画: showBlocks.x がピクセル単位の線幅。0 で線無し。
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
