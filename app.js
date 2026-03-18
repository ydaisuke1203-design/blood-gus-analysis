(function () {
  "use strict";

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

  function anionGap(hco3, na, k, cl, p, alb) {
    const out = [];

    const simpleAg = na - cl - hco3;
    const correctedAg = (na + k - cl - hco3) - (2 * alb + 0.5 + p);

    out.push(`単純Anion-Gap : ${round(simpleAg, 1)}`);
    out.push(`修正Anion-Gap : ${round(correctedAg, 1)}`);

    if (12 < simpleAg || 0 < correctedAg) out.push("Anion-gap開大");

    return out;
  }

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

    // iCa (mmol/L) の基準で判定（目安：1.12-1.32）
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

  function runAnalysis() {
    const fio2 = getNumber("fio2");
    if (!(0 < fio2 && fio2 <= 1)) throw new Error("FiO2は 0 < FiO2 <= 1 で入力してください");

    const pao2 = getNumber("pao2");
    const paco2 = getNumber("paco2");
    const hco3 = getNumber("hco3");
    const na = getNumber("na");
    const k = getNumber("k");
    const cl = getNumber("cl");
    const p = getNumber("p");
    const alb = getNumber("alb");

    const ph = getNumber("ph");
    const lac = getNumber("lac");
    const ca = getNumber("ca");
    const mg = getNumber("mg");

    const out1Lines = [];
    out1Lines.push("【Respiration analysis】");
    out1Lines.push(...respirationAnalysis(pao2, paco2, fio2));
    out1Lines.push(hr());
    out1Lines.push(...anionGap(hco3, na, k, cl, p, alb));
    setText("out1", out1Lines.join("\n"));

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
