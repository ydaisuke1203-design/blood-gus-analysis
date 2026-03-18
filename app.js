(function () {
  "use strict";

  // ---------- utils ----------
  function round(n, digits) {
    digits = digits ?? 1;
    const f = 10 ** digits;
    return Math.round(n * f) / f;
  }

  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`要素が見つかりません: ${id}`);
    return el;
  }

  function setText(id, text) {
    $(id).textContent = text;
  }

  function getNumber(id) {
    const v = Number($(id).value);
    if (!Number.isFinite(v)) throw new Error(`${id} は数値で入力してください`);
    return v;
  }

  function hr() {
    return "-".repeat(40);
  }

  // ---------- Respiration ----------
  function respirationAnalysis(pao2, paco2, fio2) {
    const out = [];

    const pf = pao2 / fio2;

    if (pf <= 100) out.push(`P/F ${round(pf, 1)}   severe ARDS`);
    else if (100 < pf && pf <= 200) out.push(`P/F ${round(pf, 1)}   moderate ARDS`);
    else if (200 < pf && pf <= 300) out.push(`P/F ${round(pf, 1)}   mild ARDS`);
    else out.push(`P/F ${round(pf, 1)}   酸素化正常`);

    if (pf < 300) out.push(paco2 <= 45 ? "1型呼吸不全" : "2型呼吸不全");

    out.push("");

    const aado2 = ((760 - 47) * fio2 - paco2 / 0.8) - pao2;
    out.push(">大気圧=760mmHg/飽和水蒸気圧=47mmHg/呼吸商=0.8と仮定すると");
    out.push(`A-aDO2 = ${round(aado2, 1)}`);

    if (20 <= aado2) {
      out.push("A-aDO2開大");
      out.push("右左シャント or 換気血流比不均等 or 拡散障害を鑑別");
    }

    return out;
  }

  // ---------- Boston approach ----------
  function bostonApproach(ph, paco2, hco3, na, k, cl, p, alb) {
    const out = [];

    out.push("");
    out.push("=".repeat(40));
    out.push("【Boston_approach】");

    // ---- acid_base_balance ----
    let predictedCo2 = null;            // number | null
    let predictedHco3Acute = null;      // number | null
    let predictedHco3Chronic = null;    // number | null

    // pH判定
    if (7.35 <= ph && ph <= 7.45) out.push("pH正常");
    else if (ph < 7.35) out.push("アシデミア");
    else out.push("アルカレミア");

    out.push(hr());

    // 酸塩基が完全に正常か
    if (22 <= hco3 && hco3 <= 26 && 35 <= paco2 && paco2 <= 45) {
      out.push("酸塩基平衡は正常");
    } else {
      out.push("酸塩基平衡異常あり");
      out.push("<1次変化>");

      // Pythonの分岐を踏襲（primary候補を列挙して予測値を計算）
      if (hco3 < 24 && paco2 < 40) {
        out.push("代謝性アシドーシス or 呼吸性アルカローシス");
        // predicted_hco3（急性/慢性）: CO2変化から算出
        predictedHco3Acute = 24 + 0.1 * (paco2 - 40);
        predictedHco3Chronic = 24 + 0.4 * (paco2 - 40);
        // predicted_co2: HCO3変化から算出
        predictedCo2 = 40 + 1.4 * (hco3 - 24);
      } else if (24 < hco3 && 40 < paco2) {
        out.push("代謝性アルカローシス or 呼吸性アシドーシス");
        predictedHco3Acute = 24 + 0.2 * (paco2 - 40);
        predictedHco3Chronic = 24 + 0.6 * (paco2 - 40);
        predictedCo2 = 40 + 0.7 * (hco3 - 24);
      } else if (hco3 < 24 && 40 < paco2) {
        out.push("混合性アシドーシス");
      } else {
        out.push("混合性アルカローシス");
      }

      out.push(hr());

      // 代謝性primary仮定（predictedCo2が計算できたときだけ評価）
      out.push("> 1次変化が代謝性であると仮定すると、");
      if (predictedCo2 !== null) {
        if (hco3 < 24) {
          if (predictedCo2 <= paco2) out.push("+ 呼吸性代償 ± 呼吸性アシドーシス");
          else out.push("+ 呼吸性アルカローシス");
        } else if (24 < hco3) {
          if (predictedCo2 < paco2) out.push("+ 呼吸性アシドーシス");
          else out.push("+ 呼吸性代償 ± 呼吸性アルカローシス");
        }
      } else {
        out.push("（代償評価：予測値が計算できないため省略）");
      }

      out.push("");

      // 呼吸性primary仮定（predictedHco3が計算できたときだけ評価）
      out.push("> 1次変化が呼吸性であると仮定すると、");
      if (predictedHco3Acute !== null && predictedHco3Chronic !== null) {
        if (40 < paco2) {
          if (predictedHco3Chronic < hco3) {
            out.push("+ 代謝性アルカローシス");
          } else if (predictedHco3Acute <= hco3 && hco3 <= predictedHco3Chronic) {
            out.push("+ 急性期かつ代謝性アルカローシス / 亜急性期 / 慢性期かつ代謝性アシドーシス");
          } else if (hco3 < predictedHco3Acute) {
            out.push("+ 代謝性アシドーシス / 超急性期(不完全代謝性代償)");
          }
        } else if (paco2 < 40) {
          // Python原文の条件が少し不自然ですが「雰囲気踏襲」で出します
          if (hco3 < predictedHco3Chronic) {
            out.push("+ 代謝性アシドーシス");
          } else if (predictedHco3Chronic <= hco3 && hco3 <= predictedHco3Acute) {
            out.push("+ 急性期かつ代謝性アシドーシス / 亜急性期 / 慢性期かつ代謝性アルカローシス");
          } else if (predictedHco3Acute < hco3) {
            out.push("+ 代謝性アルカローシス");
          }
        }
      } else {
        out.push("（代償評価：予測値が計算できないため省略）");
      }
    }

    out.push(hr());

    // ---- anion_gap ----
    const simpleAg = na - cl - hco3;
    const correctedAg = (na + k - cl - hco3) - (2 * alb + 0.5 + p); // 指定式

    // Pythonの条件を踏襲
    if (12 < simpleAg || 0 < correctedAg) {
      out.push(`単純Anion-Gap : ${round(simpleAg, 1)}`);
      out.push(`修正Anion-Gap : ${round(correctedAg, 1)}`);
      out.push("Anion-gap開大");

      const denom = (24 - hco3);
      if (denom !== 0) {
        const deltaSimple = (simpleAg - 12) / denom;
        const deltaCorrected = correctedAg / denom;

        // Pythonのメッセージ踏襲（simple or corrected のどちらかで判定）
        if (deltaSimple < 1 || deltaCorrected < 1) {
          out.push("+ Anion-gap非開大性代謝性アシドーシス");
        } else if ((1 <= deltaSimple && deltaSimple < 2) || (1 <= deltaCorrected && deltaCorrected < 2)) {
          out.push("Anion-gap非開大性病態の合併なし");
        } else {
          out.push("+ Anion-gap非開大性代謝性アルカローシス");
        }
      }
    } else {
      out.push(`単純Anion-Gap : ${round(simpleAg, 1)}`);
      out.push(`修正Anion-Gap : ${round(correctedAg, 1)}`);
      out.push("Anion-gap開大なし");
    }

    return out;
  }

  // ---------- Stewart approach (with iCa 기준) ----------
  function stewartApproach(ph, hco3, lac, na, k, cl, ca, mg, p, alb) {
    const out = [];
    out.push("【Stewart approach】");

    const sid = na + k + mg * 0.823 + ca * 2 - cl - lac;
    const atot = 10 * (alb * (0.123 * ph - 0.631)) + (p * (0.309 * ph - 0.469));
    const sig = sid - (atot + hco3);

    if (38 <= sid && sid <= 44) out.push("SID正常");
    else if (44 < sid) out.push("SID高値");
    else out.push("SID低値");

    out.push(hr());

    if (2 <= lac) out.push("高Lac血症によるアシドーシス");

    if (na < 137) out.push("低Na血症によるアシドーシス");
    else if (147 < na) out.push("高Na血症によるアルカローシス");

    if (cl < 98) out.push("低Cl血症によるアルカローシス");
    else if (108 < cl) out.push("高Cl血症によるアシドーシス");

    if (k < 3.5) out.push("低K血症によるアルカローシス");
    else if (5 < k) out.push("高K血症によるアシドーシス");

    if (mg < 1.9) out.push("低Mg血症によるアルカローシス");
    else if (2.5 < mg) out.push("高Mg血症によるアシドーシス");

    // iCa (mmol/L) 기준（目安：1.12–1.32）
    if (ca < 1.12) out.push("低iCa血症によるアルカローシス");
    else if (1.32 < ca) out.push("高iCa血症によるアシドーシス");

    if (alb <= 3.5) out.push("低Alb血症によるアルカローシス");
    else if (5 < alb) out.push("高Alb血症によるアシドーシス");

    if (p < 2.5) out.push("低P血症によるアルカローシス");
    else if (4.5 < p) out.push("高P血症によるアシドーシス");

    if (0 < sig) out.push("高Unmeasured anion(UMA)血症によるアシドーシス");

    out.push(hr());
    out.push(`SID = ${round(sid, 2)}`);
    out.push(`Atot = ${round(atot, 2)}`);
    out.push(`SIG = ${round(sig, 2)}`);

    return out;
  }

  // ---------- handlers ----------
  function runAnalysis() {
    const fio2 = getNumber("fio2");
    if (!(0 < fio2 && fio2 <= 1)) throw new Error("FiO2は 0 < FiO2 <= 1 で入力してください");

    // respiration
    const pao2 = getNumber("pao2");
    const paco2 = getNumber("paco2");

    // common / boston / stewart
    const ph = getNumber("ph");
    const hco3 = getNumber("hco3");
    const lac = getNumber("lac");
    const na = getNumber("na");
    const k = getNumber("k");
    const cl = getNumber("cl");
    const ca = getNumber("ca");
    const mg = getNumber("mg");
    const p = getNumber("p");
    const alb = getNumber("alb");

    // out1: respiration + boston
    const out1Lines = [];
    out1Lines.push("【Respiration analysis】");
    out1Lines.push(...respirationAnalysis(pao2, paco2, fio2));
    out1Lines.push(...bostonApproach(ph, paco2, hco3, na, k, cl, p, alb));
    setText("out1", out1Lines.join("\n"));

    // out2: stewart
    const out2Lines = stewartApproach(ph, hco3, lac, na, k, cl, ca, mg, p, alb);
    setText("out2", out2Lines.join("\n"));
  }

  function clearForm() {
    const ids = ["ph","pao2","paco2","hco3","lac","fio2","na","k","cl","ca","mg","p","alb"];
    for (const id of ids) $(id).value = "";
    setText("out1", "ここに結果が表示されます");
    setText("out2", "ここに結果が表示されます");
  }

  function main() {
    $("run").addEventListener("click", () => {
      try {
        runAnalysis();
      } catch (e) {
        setText("out1", String(e && e.message ? e.message : e));
        setText("out2", "");
      }
    });
    $("clear").addEventListener("click", clearForm);
  }

  main();
})();
