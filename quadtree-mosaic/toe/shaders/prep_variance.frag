// prep_variance.frag
// 元画像から「分散計算に必要な統計量」のRGBA32Fテクスチャを生成する前処理シェーダー。
//
// このTOPには Mipmap 自動生成を ON にする。すると mipmap level L のピクセルは
// 自動的に 2^L × 2^L ブロックの box-filter 平均を返すようになる。
//
// 出力:
//   .rgb = (R, G, B)                  → mipmap で mean(R), mean(G), mean(B)
//   .a   = (R² + G² + B²) / 3.0       → mipmap で mean((R²+G²+B²)/3)
//
// ブロック平均分散 (per-channel variance averaged over RGB):
//   var = mean((R²+G²+B²)/3) − (mean(R)² + mean(G)² + mean(B)²) / 3
//       = textureLod(this, uv, L).a − dot(textureLod(this, uv, L).rgb,
//                                          textureLod(this, uv, L).rgb) / 3
//
// これは p5 prototype の varianceMetric と数学的に同等。
//
// 注: sTD2DInputs[] は TD が自動宣言するので再宣言不可。
// 再宣言すると入力サンプラが上書きされ意味不明な値が出る。

out vec4 fragColor;

void main() {
    vec3 c = texture(sTD2DInputs[0], vUV.st).rgb;
    float sumSq = (c.r * c.r + c.g * c.g + c.b * c.b) / 3.0;
    fragColor = TDOutputSwizzle(vec4(c, sumSq));
}
