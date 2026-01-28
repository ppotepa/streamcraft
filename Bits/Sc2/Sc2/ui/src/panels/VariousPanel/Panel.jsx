import ISSTrackerScreen from './screens/ISSTrackerScreen';

function Panel4(props) {
    const vm = () => props.vm;

    return (
        <div class="panel" style={{ padding: 0, margin: 0, width: '100%', height: '100%' }}>
            <ISSTrackerScreen vm={vm()} />
        </div>
    );
}

export default Panel4;
