import React, { useContext, useState } from 'react';
import { Derivation, Expression, ErrorAnalysis, SpecRange, Spec } from './HerbieTypes';
import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext } from './HerbieContext';
import * as HerbieContext from './HerbieContext';
import { nextId } from './utils'
import { SelectableVisualization } from './SelectableVisualization';
import { Tooltip } from 'react-tooltip'
import * as herbiejs from './herbiejs'
import * as fpcore from './fpcore'
import * as types from './HerbieTypes'
import { LocalError } from './LocalError';
import { DerivationComponent } from './DerivationComponent';
import KaTeX from 'katex';
const math11 = require('mathjs11');


import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

// // @ts-ignore
// import { VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

// provideVSCodeDesignSystem().register(vsCodeButton());


import './ExpressionTable.css';
import { error } from 'console';

function ExpressionTable() {
  // translate the above to use useGlobal
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext)
  const [analyses, setAnalyses] = HerbieContext.useGlobal(HerbieContext.AnalysesContext)
  const [compareExprIds, setCompareExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext)
  const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext)
  const [expressionStyles, setExpressionStyles] = HerbieContext.useGlobal(HerbieContext.ExpressionStylesContext)
  const [spec,] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext)
  const [samples,] = HerbieContext.useGlobal(HerbieContext.SamplesContext)
  const [serverUrl,] = HerbieContext.useGlobal(HerbieContext.ServerContext)

  const sample = samples.find((sample) => sample.id === selectedSampleId)
  if (!sample) {
    // show error message on page
    return <div>Sample id {selectedSampleId} not found</div>
  }

  const [addExpression, setAddExpression] = useState('');
  const [clickedRowId, setClickedRowId] = useState<number | null>(null); // State to keep track of the clicked row id
  const [useTex, setUseTex] = useState(true);

  // keep track of expanded expressions
  const [expandedExpressions, setExpandedExpressions] = useState<number[]>([]);

  // const { expressionIdsForSpecs } = useContext(HerbieContext.ExpressionIdsForSpecsContext)  

  //const { spec } = useContext(SpecContext);
  // const [spec, ] = HerbieContext.useGlobal(HerbieContext.SpecContext)

  const handleExpressionClick = (id: number) => {
    setSelectedExprId(id);
    // setClickedRowId(id);
  }

  const handleExpandClick = (id: number) => {
    // toggle expandedExpressions
    if (expandedExpressions.includes(id)) {
      setExpandedExpressions(expandedExpressions.filter((exprId) => exprId !== id));
    }
    else {
      setExpandedExpressions([...expandedExpressions, id]);
    }
  }


  const handleCheckboxChange = (event: any, id: number) => {
    if (event.target.checked) {
      setCompareExprIds([...compareExprIds, id]);
    } else {
      setCompareExprIds(compareExprIds.filter((exprId) => exprId !== id));
    }
  };

  // exprId is the first available id for a new expression given the current values in expressions
  // we compute this by sorting expressions on id and then finding the first id that is not used
  const getNextExprId = (expressions: Expression[]) => () => expressions.sort((a, b) => a.id - b.id).reduce((acc, curr) => {
    if (acc === curr.id) {
      return acc + 1;
    } else {
      return acc;
    }
  }, 0);
  
  const noneExpanded = expandedExpressions.length === 0;

  const handleExpandAllClick = () => {
    if (noneExpanded) {
      setExpandedExpressions(expressions.map((expr) => expr.id));
    } else {
      setExpandedExpressions([]);
    }
  }

  const extraVariables = (expression: string) => {
    const specVariables = fpcore.getVarnamesMathJS(spec.expression);
    const expressionVariables = fpcore.getVarnamesMathJS(expression);

    return expressionVariables.filter((symbol) => !specVariables.includes(symbol));
  };

  const addExpressionErrors = (expression: string) : string[] => {
    try {
      fpcore.getVarnamesMathJS(expression);
    } catch (e) {
      return [(e as Error).toString()];
    }
    const variables = extraVariables(expression);

    if (variables.length !== 0) {
      const variableListString = variables.join(", ");
      const errorMessage =
        "The added expression is not valid. The expression you tried to add has the following variables not seen in the spec expression: " +
        variableListString;
      return [errorMessage];
    }
    return []
  }

  const validateExpression = (expression: string) => {
    const errors = addExpressionErrors(expression)
    if (errors.length !== 0) {
      throw new Error(errors[0])
    }
  }

  return (
    <div className="expression-table">
      <div className="expression-table-header-row">
        <div className="expand-header">
        <div onClick={() => handleExpandAllClick()}>
                      {noneExpanded ? '+' : '−'}
                    </div>
        </div>
        <div className="checkbox-header">
          <input type="checkbox"></input>
        </div>
        <div className="expressions-header">
          Expression
        </div>
        <div className="compare-header">
        </div>
        <div className="error-header">
          Error
        </div>
        <div className="buttons-header">

        </div>
      </div>
      <div className="expressions">
        <div className="add-expression">
          <div className="add-expression-top">
            {/* <div className="checkbox">
                  <input type="checkbox"></input>
                </div> */}
            <textarea value={addExpression} onChange={(event) => setAddExpression(event.target.value)} />
            <div className="add-expression-button">
              <button 
                disabled={addExpression.trim() === '' || addExpressionErrors(addExpression).length !== 0}
                onClick={() => {
                  validateExpression(addExpression);
                  setExpressions([
                    new Expression(addExpression, nextId(expressions)),
                    ...expressions,
                  ]);
                }}
              >
                Add
              </button>
            </div>
          </div>
          <div className="add-expression-dropdown">
            <div className="add-expression-tex" dangerouslySetInnerHTML={{
                __html: (() => {
                  try {      
                    return addExpression.trim() === '' ? '' : KaTeX.renderToString(math11.parse(addExpression).toTex(), { throwOnError: false })
                  } catch (e) {
                    //throw e;
                    return (e as Error).toString()
                  }
                })()
              }} />
          </div>
        </div>
      </div>
      {/* <SimpleBar style={{ maxHeight: 'initial' }}> */}
        <div className="expressions-actual">
          {expressions.map((expression) => {
            const isChecked = compareExprIds.includes(expression.id);
            const analysisData = analyses.find((analysis) => analysis.expressionId === expression.id)?.data;
            const analysisResult =
              !analysisData
                ? '...'
                : (analysisData.errors.reduce((acc: number, v: any) => {
                  return acc + v;
                }, 0) / 8000).toFixed(2);
            const color = expressionStyles.find((style) => style.expressionId === expression.id)?.color
            const components = [
                { value: 'localError', label: 'Local Error', component: <LocalError expressionId={expression.id} /> },
                { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent /> },
              ];
            return (
              <div className={`expression-container ${expression.id === selectedExprId ? 'selected' : ''}`}>
                <div key={expression.id} className={`expression`} >
                  {/* expand button [+] */}
                  <div className="expand">
                    <div onClick={() => handleExpandClick(expression.id)}>
                      {expandedExpressions.includes(expression.id) ? '−' : '+' }
                    </div>
                  </div>
                  <input type="checkbox" checked={isChecked} onChange={event => handleCheckboxChange(event, expression.id)} onClick={event => event.stopPropagation()}
                    style={({ accentColor: color })}
                  />
                <div className="expression-text" onClick={() => handleExpressionClick(expression.id)} >
                    {expression.text}
                  </div>
                  <div className="expression-tex" dangerouslySetInnerHTML={{
                      __html: (() => {
                        try {
                          // Check if there are no variables
                          if (fpcore.getVarnamesMathJS(spec.expression).length === 0) {
                            throw new Error("No variables detected.")
                          }
                          
                          return KaTeX.renderToString(math11.parse(expression.text).toTex(), { throwOnError: false })
                        } catch (e) {
                          //throw e;
                          return (e as Error).toString()
                        }
                      })()
                    }} />
                  <div className="analysis">
                    {analysisResult}
                  </div>
                  <div className="herbie">
                    <button onClick={async () => { 
                      // get suggested expressions with Herbie and put them in the expressions table
                      // TODO for now we default to the spec expression, but we will soon send this particular expression
                      console.log('suggesting expression')
                      const suggested = await herbiejs.suggestExpressions(fpcore.mathjsToFPCore(expression.text, spec.expression, fpcore.getVarnamesMathJS(spec.expression)), sample, serverUrl)
                      console.log('suggested', suggested)

                      const alternatives = suggested.alternatives
                      const derivations = suggested.histories
                      
                      // add the suggested expressions to the expressions table
                      setExpressions([
                        ...await Promise.all(suggested.alternatives.map(async (s: types.FPCore, i) =>
                            new Expression(await herbiejs.fPCoreToMathJS(s, serverUrl), nextId(expressions) + i))),
                        ...expressions,
                      ]);

                      // add the derivations to the expressions table
                      setDerivations(suggested.histories);
                    }}>
                      Herbie
                    </button>
                  </div>
                  
                  <div className="copy" onClick={() => { navigator.clipboard.writeText(expression.text) }} data-tooltip-id="copy-tooltip" >
                    <a className="copy-anchor">⧉</a>
                  </div>
                  <div className="delete">
                    <button onClick={() => setExpressions(expressions.filter((e) => e.id !== expression.id))}>
                    ╳
                    </button>
                  </div>
                </div>
                {expandedExpressions.includes(expression.id) && (
                  <div className="dropdown" onClick={() => handleExpressionClick(expression.id)}>
                    <SelectableVisualization components={components} />
                  </div>
                )}
              </div>
            );
          })}                
        </div>
        < Tooltip anchorSelect=".copy-anchor" place="top" >
          Copy to clipboard
        </Tooltip> 
      {/* </SimpleBar> */}
    </div>
  )
}

export { ExpressionTable }