import { Show, For } from 'solid-js';

function ReservedScreen(props) {
    const vm = () => props.vm;

    return (
        <div class="panel-4-body">
            <Show when={vm()?.badge}>
                <div class="panel-4-badge">{vm().badge}</div>
            </Show>

            <Show when={vm()?.lines && vm().lines.length > 0} fallback={
                <div class="list-empty">Reserved for future use</div>
            }>
                <For each={vm().lines}>
                    {(line) => <div class="panel-4-line">{line}</div>}
                </For>
            </Show>
        </div>
    );
}

export default ReservedScreen;
