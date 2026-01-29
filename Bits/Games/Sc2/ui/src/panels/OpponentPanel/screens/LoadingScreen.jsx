import { createSignal, onCleanup, For } from 'solid-js';

function LoadingScreen(props) {
    const [dots, setDots] = createSignal('.');

    // Animate loading dots
    const interval = setInterval(() => {
        setDots(prev => {
            if (prev === '...') return '.';
            return prev + '.';
        });
    }, 500);

    onCleanup(() => clearInterval(interval));

    // Default lines if not provided
    const lines = () => props.lines || [
        "STREAMCRAFT v2.0.0",
        "Initializing overlay system..",
        "Waiting for match data..",
        "Loading opponent data"
    ];

    return (
        <div class="console-screen">
            <div class="console-title">SC2 CONSOLE</div>
            <div class="console-body">
                <For each={lines()}>
                    {(line, index) => {
                        const isLastLine = index() === lines().length - 1;
                        return (
                            <div class="console-line">
                                <span class="console-prompt">&gt;</span>
                                <span class="console-text">{line}{isLastLine ? dots() : ''}</span>
                            </div>
                        );
                    }}
                </For>
                <div class="console-line console-cursor">
                    <span class="console-prompt">&gt;</span>
                    <span class="console-text">_</span>
                </div>
            </div>
        </div>
    );
}

export default LoadingScreen;
