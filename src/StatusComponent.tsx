import React, { useContext, useState, useEffect } from 'react';
import { InputRange, InputRangesEditor } from './InputRangesEditor';
import { ExpressionsContext, ServerContext, SpecContext } from './HerbieContext';

import './StatusComponent.css';

const timeBetweenChecks = 3000; // Time between checking for the status, in milliseconds

function ServerStatusComponent() {
    const { serverUrl: value, setServerUrl: setValue } = useContext(ServerContext);
    const [serverUrl, setServerUrl] = useState<string>('http://127.0.0.1:8000');

    const [status, setStatus] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(`${serverUrl}/up`);
                setStatus(response.status);
            } catch (error) {
                setStatus(null);
            }
        };

        fetchStatus();
        const intervalId = setInterval(fetchStatus, timeBetweenChecks);
        return () => clearInterval(intervalId);
    }, [serverUrl]);

    const handleIPChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setServerUrl(event.target.value);
    };

    const handleDropdownClick = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    return (
        <div>
            <p className={status ? 'connected' : 'no-server'}>
                {status ? 'Connected' : 'No Server'}
            </p>
            <button onClick={handleDropdownClick}>
                {isDropdownOpen ? '▲' : '▼'}
            </button>
            {isDropdownOpen && (
                <div>
                    <input type='text' value={serverUrl} onChange={handleIPChange} />
                </div>
            )}
        </div>
    );
}

export { ServerStatusComponent };