import * as fpcorejs from './fpcore';
import * as ordinalsjs from './ordinals';
import { Sample } from './HerbieTypes';
import * as types from './HerbieTypes';


interface HerbieResponse {
  error?: string;
  mathjs?: string;
  points: any[];
  tree?: types.LocalErrorTree;
}

// All Herbie API calls are POSTs to /api/{endpoint}
const getHerbieApi = async (
  host: string,
  endpoint: string,
  data: object,
  retry: boolean
): Promise<any> => {
  const url = `${host}/api/${endpoint}`;
  // LATER add timeout?
  console.debug('calling', url, 'with data', data);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const responseData = await response.json();
    if (responseData.error) {
      throw new Error('Herbie server: ' + responseData.error);
    }
    console.debug('got data', responseData);
    return responseData;
  } catch (error: any) {
    throw new Error(`Error sending data to Herbie server at ${url}:\n${error.message}`)
    // old retry code
    // console.error('Bad call to', url, 'with data', data, 'error was', error);
    // if (retry) {
    //   console.error('retrying once');
    //   return getHerbieApi(host, endpoint, data, false);
    // } else {
    //   throw new Error(`Error sending data to Herbie server at ${url}:\n${error.message}`);
    // }
  }
};

export const getSample = async (
  fpcore: string,
  host: string
): Promise<HerbieResponse> => {
  return getHerbieApi(host, 'sample', { formula: fpcore, seed: 5 }, true);
};

export type FPCore = string;
export type HTMLHistory = string;
type ordinal = number;

/** 
 * The response containing alternatives from Herbie.
 * Each alternative will have a history (derivation) and
 * splitpoints that correspond to the alternatives array
 * (e.g. alternatives[1] will have its history stored in
 * histories[1] and splitpoints in splitpoints[1])
**/
interface HerbieAlternativesResponse {
  alternatives: FPCore[];

  /** The history of each alternative. (e.g. alternatives[1] will have its history stored in
 * histories[1] and splitpoints in splitpoints[1]) */
  histories: HTMLHistory[];

  /** The splitpoints for each alternative. (e.g. alternatives[1] will have its history stored in
 * histories[1] and splitpoints in splitpoints[1]) */
  splitpoints: ordinal[][];
}

export const suggestExpressions = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<HerbieAlternativesResponse> => {
  return getHerbieApi(host, 'alternatives', { formula: fpcore, sample: sample.points, seed: 5 }, true);
};

interface LocalErrorResponse {
  tree: types.LocalErrorTree;
}

export const analyzeLocalError = async (
  fpcore: string,
  sample: Sample,
  host: string
): Promise<types.LocalErrorTree> => {
  return (await getHerbieApi(host, 'localerror', { formula: fpcore, sample: sample.points, seed: 5 }, true) as LocalErrorResponse).tree;
};

type point = ordinal[]
type error = string

interface AnalyzeResponse {
  points: [point, error][];
}

export const analyzeExpression = async (
  fpcore: string,
  sample: Sample,
  host: string
) => {
  function fastMin(arr: number[]) {
    var len = arr.length, min = Infinity;
    while (len--) {
      if (arr[len] < min) {
        min = arr[len];
      }
    }
    return min;
  };
  
  function fastMax(arr: number[]) {
    var len = arr.length, max = -Infinity;
    while (len--) {
      if (arr[len] > max) {
        max = arr[len];
      }
    }
    return max;
  };



  const pointsAndErrors = ((await getHerbieApi(host, 'analyze', { formula: fpcore, sample: sample.points, seed: 5 }, true)) as AnalyzeResponse).points;
  const ordinalSample = sample.points.map(p => p[0].map((v: number) => ordinalsjs.floatToApproximateOrdinal(v)));

  const vars = fpcorejs.getVarnamesFPCore(fpcore);
  const ticksByVarIdx : [string, number][][]= vars.map((v, i) => {
    const values = sample.points.map(p => p[0][i]);
    return ordinalsjs.chooseTicks(fastMin(values), fastMax(values)).map(v => [displayNumber(v), ordinalsjs.floatToApproximateOrdinal(v)]);
  });

  // console.debug(`ticksByVarIdx`, sample, ticksByVarIdx);

  const splitpointsByVarIdx = vars.map(v => []);  // HACK no splitpoints for now
  const errors = pointsAndErrors.map(([point, error]) => parseFloat(error));
  const meanBitsError = parseFloat((errors.reduce((sum, v) => sum + v, 0) / errors.length).toFixed(2));
  return {
    ordinalSample,
    ticksByVarIdx,
    splitpointsByVarIdx,
    bits: 64,
    vars,
    errors,
    meanBitsError
    // pointsJson: { points: ordinalSample, ticks_by_varidx: ticksByVarIdx, splitpoints_by_varidx: splitpointsByVarIdx, bits: 64, vars, error: { target: errors } }, meanBitsError
  };
};

export const displayNumber = (v: number) => {
  const s = v.toPrecision(1)
  const [base, exponent] = s.split('e')
  const digits = 4
  if (!exponent) {
    return v.toPrecision(1) === v.toString() ? v.toPrecision(1) : v.toPrecision(digits)
  }
  if (Number(exponent) <= 1 && -1 <= Number(exponent)) {
    const a = v.toString()
    const b = v.toPrecision(digits)
    return a.length < b.length ? a : b
  }
  const result = v.toPrecision(1)
  return result.startsWith('1e') ? result.slice(1) : result
}

export const fPCoreToMathJS = async (
  fpcore: string,
  host: string
): Promise<string> => {
  return (await getHerbieApi(host, 'mathjs', { formula: fpcore, seed: 5 }, true)).mathjs;
};