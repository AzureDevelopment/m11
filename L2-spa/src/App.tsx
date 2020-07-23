import React from 'react';
import logo from './logo.svg';
import './App.css';

export const App = () => {
    const [appVersion, setAppVersion] = React.useState<number | null>(null);

    React.useEffect(() => {
        fetch(`https://generalgruba.blob.core.windows.net/share/version.json`)
            .then((x) => x.json())
            .then((x) => setAppVersion(x.version));
    });
    return (
        <div className='App'>
            <header className='App-header'>
                <img src={logo} className='App-logo' alt='logo' />
                <p>{appVersion ? `Wersja: ${appVersion}` : null}</p>
            </header>
        </div>
    );
};

export default App;
