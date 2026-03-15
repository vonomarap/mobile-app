import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { CalcConfig, DEFAULT_BASE_RATE } from "../utils/calc";

export async function fetchCalcConfig(): Promise<CalcConfig> {
  const configRef = doc(db, "calc_config", "global");
  const configDoc = await getDoc(configRef);

  if (!configDoc.exists()) {
    return {
      baseRates: { default: DEFAULT_BASE_RATE },
      coefficients: {
        material: {},
        profileSeries: {},
        profileDepthMm: {},
        glazing: {},
        lamination: {},
        laminationGroup: {},
        laminationSide: {},
        glassOptions: {},
        door: {
          fillType: {},
          fillTop: {},
          fillBottom: {},
        }
      },
      options: {},
      fees: {
        openingSash: { turn: 0, tiltTurn: 0 },
        meetingPairKit: 0,
        mullionPerM: 0,
        install: { perM2: 0, perSash: 0 },
        delivery: { base: 0, freeKm: 0, perKm: 0 }
      },
      roundingRules: { step: 1 },
      windowGeometry: {
        Fw_mm: 70,
        Fh_mm: 70,
        Mw_mm: 60,
        minSashW_mm: 300,
        minSashH_mm: 400,
        minFixedW_mm: 200,
        glassInsetW_mm: 0,
        glassInsetH_mm: 0,
      },
    };
  }

  return (configDoc.data() as CalcConfig) ?? {};
}
