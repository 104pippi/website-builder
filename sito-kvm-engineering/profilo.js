// Il profilo a C con risvolti che esce dalla linea di profilatura, piegato al grado p
// (0 = nastro piano, 1 = profilo finito). Lo usano la scena 3D e il flower pattern dei servizi.

export const SVILUPPO = 2;            // larghezza del nastro piano
const PIEGHE = [0.375, 0.825];        // distanza dal centro: anima|ala e ala|risvolto
const RAGGIO = 0.06;                  // mezza larghezza della zona di piega

export const liscio = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Angoli delle due pieghe: le ali salgono per prime, i risvolti si chiudono nelle ultime stazioni
export function angoli(p) {
  return [Math.PI / 2 * liscio(0, 0.72, p), Math.PI / 2 * liscio(0.3, 1, p)];
}

// Punti [x, y] da un bordo all'altro (2 * meta + 1), anima centrata in x = 0 e appoggiata su y = 0
export function sezione(p, meta = 24) {
  const [a1, a2] = angoli(p);
  const passo = SVILUPPO / 2 / meta, fini = 6;
  const destra = [[0, 0]];
  let x = 0, y = 0;
  for (let i = 0; i < meta; i++) {
    for (let j = 0; j < fini; j++) {
      const s = (i + (j + 0.5) / fini) * passo;
      const th = a1 * liscio(PIEGHE[0] - RAGGIO, PIEGHE[0] + RAGGIO, s)
               + a2 * liscio(PIEGHE[1] - RAGGIO, PIEGHE[1] + RAGGIO, s);
      x += Math.cos(th) * passo / fini;
      y += Math.sin(th) * passo / fini;
    }
    destra.push([x, y]);
  }
  const punti = [];
  for (let i = destra.length - 1; i > 0; i--) punti.push([-destra[i][0], destra[i][1]]);
  return punti.concat(destra);
}
