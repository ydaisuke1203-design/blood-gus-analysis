(function () {

    "use strict";

    // ---------- utility ----------

    function round(n, digits) {

        digits = digits ?? 1;

        const f = 10  digits;

        return Math.round(n * f) / f;

    }

    function setText(id, text) {

        const el = document.getElementById(id);

        if (el) el.textContent = text;

    }

    function getNumber(id) {

        const el = document.getElementById(id);

        const v = Number(el.value);

        if (!Number.isFinite(v)) throw new Error(`${id} は数値で入力してください`);

        return v;

    }

    // ---------- domain logic ----------

    function respirationAnalysis(pao2, paco2, fio2) {

        const out = [];

        const pf = pao2 / fio2;

        // 指定の境界：

        // <=100 severe, 100< && <=200 moderate, 200< && <=300 mild, 300< normal

        if (pf <= 100) out.push(`P/F ${round(pf, 1)}   severe ARDS`);

        else if (100 < pf && pf <= 200) out.push(`P/F ${round(pf, 1)}   moderate ARDS`);

        else if (200 < pf && pf <= 300) out.push(`P/F ${round(pf, 1)}   mild ARDS`);

        else out.push(`P/F ${round(pf, 1)}   酸素化正常`);

        if (pf < 300) {

            if (paco2 <= 45) out.push("1型呼吸不全");

            else out.push("2型呼吸不全");

        }

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

        const correctedAg = (na + k - cl - hco3) - (2 * alb + 0.5 + p); // 指定式

        if (12 < simpleAg || 0 < correctedAg) {

            out.push(`単純Anion-Gap : ${round(simpleAg, 1)}`);

            out.push(`修正Anion-Gap : ${round(correctedAg, 1)}`);

            out.push("Anion-gap開大");

        }

        return out;

    }

    // ---------- event handlers ----------

    function runAnalysis() {

        const fio2 = getNumber("fio2");

        if (!(0 < fio2 && fio2 <= 1)) throw new Error("FiO2は 0 < FiO2 <= 1 で入力してください");

        // 入力取得（今は最小限。今後Stewart/Bostonを足す時にここを拡張）

        const pao2 = getNumber("pao2");

        const paco2 = getNumber("paco2");

        const hco3 = getNumber("hco3");

        const na = getNumber("na");

        const k = getNumber("k");

        const cl = getNumber("cl");

        const p = getNumber("p");

        const alb = getNumber("alb");

        const out1 = [

            ...respirationAnalysis(pao2, paco2, fio2),

            "----------------------------------------",

            ...anionGap(hco3, na, k, cl, p, alb),

        ].join("n");

        setText("out1", out1);

        setText("out2", "（Stewartは次のステップで実装）");

    }

    function clearForm() {

        const ids = ["ph", "pao2", "paco2", "hco3", "lac", "fio2", "na", "k", "cl", "ca", "mg", "p", "alb"];

        for (const id of ids) {

            const el = document.getElementById(id);

            if (el) el.value = "";

        }

        setText("out1", "ここに結果が表示されます");

        setText("out2", "ここに結果が表示されます");

    }

    // ---------- init ----------

    function main() {

        const runBtn = document.getElementById("run");

        const clearBtn = document.getElementById("clear");

        if (runBtn) {

            runBtn.addEventListener("click", () => {

                try {

                    runAnalysis();

                } catch (e) {

                    setText("out1", String(e && e.message ? e.message : e));

                    setText("out2", "");

                }

            });

        }

        if (clearBtn) clearBtn.addEventListener("click", clearForm);

    }

    main();

})();