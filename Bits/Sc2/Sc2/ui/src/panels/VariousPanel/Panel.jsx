import ReservedScreen from './screens/ReservedScreen';

function Panel4(props) {
    const vm = () => props.vm;

    return (
        <div class="panel">
            <div class="panel-title">{vm()?.title ?? 'RESERVED'}</div>

            <div class="strip">{vm()?.title ?? 'Coming soon'}</div>

            <ReservedScreen vm={vm()} />
        </div>
    );
}

export default Panel4;
