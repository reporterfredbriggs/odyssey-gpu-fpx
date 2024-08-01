import React, { useState } from 'react';
import * as Contexts from './HerbieContext';
import * as fpcorejs from './lib/fpcore';
import { analyzeExpressionExport, ExpressionExportResponse } from './lib/herbiejs';

interface ExpressionExportProps {
    expressionId: number;
}

const ExpressionExport: React.FC<ExpressionExportProps> = ({ expressionId }) => {
    const supportedLanguages = ["python", "c", "fortran", "java", "julia", "matlab", "wls", "tex", "js"];

    // Export the expression to a language of the user's choice
    const [expressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
    const [serverUrl] = Contexts.useGlobal(Contexts.ServerContext);

    // Get the expression text
    const expressionText = expressions[expressionId].text;

    // Get user choice
    const [language, setLanguage] = useState(supportedLanguages[0]);
    const [exportCode, setExportCode] = useState<ExpressionExportResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Make server call to get translation when user submits
    const translateExpression = async () => {
        try {
            const response = await analyzeExpressionExport(
                fpcorejs.mathjsToFPCore(expressionText),
                language,
                serverUrl
            );
            console.log(response)
            setExportCode(response);
            setError(null);
        } catch (err: any) {
            setError('Error: ' + (err.message || err));
            setExportCode(null);
        }
    };

    return (
        <div>
            {/* Choose language */}
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                ))}
            </select>

            {/* Display the export code or error message */}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {exportCode ? (
                <pre>{`Language: ${exportCode.language}\n${exportCode.result}`}</pre>
            ) : (
                <p>No export code available.</p>
            )}

            {/* Export button */}
            <button onClick={translateExpression}>Submit</button>
        </div>
    );
};

export default ExpressionExport;
