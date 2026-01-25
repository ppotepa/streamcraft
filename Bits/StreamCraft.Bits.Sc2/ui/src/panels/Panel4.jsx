import { Show, For } from 'solid-js';

function Panel4(props) {
    const vm = () => props.vm;

    return (
        <div class="panel">
            <div class="panel-title">{vm()?.title ?? 'RESERVED'}</div>

            <div class="strip">{vm()?.title ?? 'Coming soon'}</div>

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
        </div>
    );
}

export default Panel4;
