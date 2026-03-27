// URL-based filter state for shareable links
import { AppState } from './state.js';
import { getRepeaterId } from './utils.js';

const FILTER_PARAMS = [
    { id: 'zipCode',                      key: 'zip',     type: 'text' },
    { id: 'distance',                     key: 'dist',    type: 'select',   valid: ['10','25','50','100'] },
    { id: 'bandFilter',                   key: 'band',    type: 'multi',    valid: ['6m','2m','1.25m','70cm','33cm','23cm'] },
    { id: 'callFilter',                   key: 'call',    type: 'text' },
    { id: 'wideCoverageFilter',           key: 'wide',    type: 'checkbox' },
    { id: 'showFavoritesOnly',            key: 'favs',    type: 'checkbox' },
    { id: 'showClosedFilter',             key: 'closed',  type: 'checkbox' },
    { id: 'drawIntertieLinksFilter',      key: 'ilinks',  type: 'checkbox' },
    { id: 'drawOtherLinksFilter',         key: 'olinks',  type: 'checkbox' },
    { id: 'drawNonValidatedLinksFilter',  key: 'nvlinks', type: 'checkbox' },
];

const VALID_VIEWS = ['table', 'map', 'both'];

export function serializeFilters() {
    const params = new URLSearchParams();

    for (const filter of FILTER_PARAMS) {
        const el = document.getElementById(filter.id);
        if (!el) continue;

        if (filter.type === 'text') {
            const val = el.value.trim();
            if (val) params.set(filter.key, val);
        } else if (filter.type === 'select') {
            const val = el.value;
            if (val) params.set(filter.key, val);
        } else if (filter.type === 'multi') {
            const selected = Array.from(el.selectedOptions).map(o => o.value);
            if (selected.length > 0) params.set(filter.key, selected.join(','));
        } else if (filter.type === 'checkbox') {
            if (el.checked) params.set(filter.key, '1');
        }
    }

    if (AppState.currentView !== 'table') {
        params.set('view', AppState.currentView);
    }

    if (AppState.detailRepeater) {
        params.set('detail', getRepeaterId(AppState.detailRepeater));
    }

    return params;
}

export function deserializeFilters(searchString) {
    const params = new URLSearchParams(searchString);
    const state = {};

    for (const filter of FILTER_PARAMS) {
        const val = params.get(filter.key);
        if (val === null) continue;

        if (filter.type === 'text') {
            state[filter.id] = val;
        } else if (filter.type === 'select') {
            if (filter.valid.includes(val)) {
                state[filter.id] = val;
            }
        } else if (filter.type === 'multi') {
            const values = val.split(',').filter(v => filter.valid.includes(v));
            if (values.length > 0) state[filter.id] = values;
        } else if (filter.type === 'checkbox') {
            state[filter.id] = val === '1';
        }
    }

    const view = params.get('view');
    if (view && VALID_VIEWS.includes(view)) {
        state._view = view;
    }

    const detail = params.get('detail');
    if (detail) {
        state._detail = detail;
    }

    return state;
}

export function pushFiltersToURL() {
    const params = serializeFilters();
    const search = params.toString();
    const url = search ? `?${search}` : window.location.pathname;
    history.replaceState(null, '', url);
}

export function loadFiltersFromURL() {
    const search = window.location.search;
    if (!search) return false;

    const state = deserializeFilters(search);
    const hasParams = Object.keys(state).length > 0;
    if (!hasParams) return false;

    // Populate DOM elements from URL state
    for (const filter of FILTER_PARAMS) {
        if (!(filter.id in state)) continue;

        const el = document.getElementById(filter.id);
        if (!el) continue;

        if (filter.type === 'text' || filter.type === 'select') {
            el.value = state[filter.id];
        } else if (filter.type === 'multi') {
            const values = state[filter.id];
            Array.from(el.options).forEach(opt => {
                opt.selected = values.includes(opt.value);
            });
        } else if (filter.type === 'checkbox') {
            el.checked = state[filter.id];
        }
    }

    return state._view || true;
}
