import NormalScreen from './screens/NormalScreen';

function Panel1(props) {
    return (
        <div class="panel">
            <NormalScreen vm={props.vm} nowMs={props.nowMs} />
        </div>
    );
}

export default Panel1;
