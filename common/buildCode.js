const COMPONENTS_MAP = {
    grid: 'GridComponent',
    polar: 'PolarComponent',
    geo: 'GeoComponent',
    singleAxis: 'SingleAxisComponent',
    parallel: 'ParallelComponent',
    calendar: 'CalendarComponent',
    graphic: 'GraphicComponent',
    toolbox: 'ToolboxComponent',
    tooltip: 'TooltipComponent',
    axisPointer: 'AxisPointerComponent',
    brush: 'BrushComponent',
    title: 'TitleComponent',
    timeline: 'TimelineComponent',
    markPoint: 'MarkPointComponent',
    markLine: 'MarkLineComponent',
    markArea: 'MarkAreaComponent',
    legend: 'LegendComponent',
    dataZoom: 'DataZoomComponent',
    visualMap: 'VisualMapComponent',
    aria: 'AriaComponent',
    dataset: 'DatasetComponent',

    // Dependencies
    xAxis: 'GridComponent',
    yAxis: 'GridComponent',
    angleAxis: 'PolarComponent',
    radiusAxis: 'PolarComponent'
}

const CHARTS_MAP = {
    line: 'LineChart',
    bar: 'BarChart',
    pie: 'PieChart',
    scatter: 'ScatterChart',
    radar: 'RadarChart',
    map: 'MapChart',
    tree: 'TreeChart',
    treemap: 'TreemapChart',
    graph: 'GraphChart',
    gauge: 'GaugeChart',
    funnel: 'FunnelChart',
    parallel: 'ParallelChart',
    sankey: 'SankeyChart',
    boxplot: 'BoxplotChart',
    candlestick: 'CandlestickChart',
    effectScatter: 'EffectScatterChart',
    lines: 'LinesChart',
    heatmap: 'HeatmapChart',
    pictorialBar: 'PictorialBarChart',
    themeRiver: 'ThemeRiverChart',
    sunburst: 'SunburstChart',
    custom: 'CustomChart'
}
const COMPONENTS_GL_MAP = {

    grid3D: 'Grid3DComponent',
    geo3D: 'Geo3DComponent',
    globe: 'GlobeComponent',
    mapbox3D: 'Mapbox3DComponent',
    maptalks3D: 'Maptalks3DComponent',

    // Dependencies
    xAxis3D: 'Grid3DComponent',
    yAxis3D: 'Grid3DComponent',
    zAxis3D: 'Grid3DComponent',
}
const CHARTS_GL_MAP = {
    bar3D: 'Bar3DChart',
    line3D: 'Line3DChart',
    scatter3D: 'Scatter3DChart',
    lines3D: 'Lines3DChart',
    polygons3D: 'Polygons3DChart',
    surface: 'SurfaceChart',
    map3D: 'Map3DChart',

    scatterGL: 'ScatterGLChart',
    graphGL: 'GraphGLChart',
    flowGL: 'FlowGLChart',
    linesGL: 'LinesGLChart'
}

const COMPONENTS_MAP_REVERSE = {};
const CHARTS_MAP_REVERSE = {};
const CHARTS_GL_MAP_REVERSE = {};
const COMPONENTS_GL_MAP_REVERSE = {};

const RENDERERS_MAP_REVERSE = {
    'SVGRenderer': 'svg',
    'CanvasRenderer': 'canvas'
}

// Component that will be injected automatically in preprocessor
// These should be excluded util find they were used explicitly.
const MARKERS = ['markLine', 'markArea', 'markPoint'];
const INJECTED_COMPONENTS = [
    ...MARKERS, 'grid', 'axisPointer',
    'aria'  // TODO aria
];

// Component that was dependent.
const DEPENDENT_COMPONENTS = [
    'xAxis', 'yAxis', 'angleAxis', 'radiusAxis',
    'xAxis3D', 'yAxis3D', 'zAxis3D'
];

function createReverseMap(map, reverseMap) {
    Object.keys(map).forEach(key => {
        // Exclude dependencies.
        if (DEPENDENT_COMPONENTS.includes(key)) {
            return;
        }
        reverseMap[map[key]] = key;
    });
}

createReverseMap(COMPONENTS_MAP, COMPONENTS_MAP_REVERSE);
createReverseMap(CHARTS_MAP, CHARTS_MAP_REVERSE);
createReverseMap(COMPONENTS_GL_MAP, COMPONENTS_GL_MAP_REVERSE);
createReverseMap(CHARTS_GL_MAP, CHARTS_GL_MAP_REVERSE);

module.exports.collectDeps = function collectDeps(option) {
    let deps = [];
    if (option.options) {

        // TODO getOption() doesn't have baseOption and options.
        option.options.forEach((opt) => {
            deps = deps.concat(collectDeps(opt));
        });

        if (option.baseOption) {
            deps = deps.concat(collectDeps(option.baseOption))
        }

        // Remove duplicates
        return Array.from(new Set(deps));
    }

    Object.keys(option).forEach((key) => {
        if (INJECTED_COMPONENTS.includes(key)) {
            return;
        }
        const val = option[key];

        if (Array.isArray(val) && !val.length) {
            return;
        }

        if (COMPONENTS_MAP[key]) {
            deps.push(COMPONENTS_MAP[key]);
        }
        if (COMPONENTS_GL_MAP[key]) {
            deps.push(COMPONENTS_GL_MAP[key]);
        }
    });

    let series = option.series;
    if (!Array.isArray(series)) {
        series = [series];
    }

    series.forEach((seriesOpt) => {
        if (CHARTS_MAP[seriesOpt.type]) {
            deps.push(CHARTS_MAP[seriesOpt.type]);
        }
        MARKERS.forEach(markerType => {
            if (seriesOpt[markerType]) {
                deps.push(COMPONENTS_MAP[markerType]);
            }
        });
    });

    // Remove duplicates
    return Array.from(new Set(deps));
}

function buildMinimalImportCode(deps, includeType) {
    const chartsImports = [];
    const componentsImports = [];
    const chartsGLImports = [];
    const componentsGLImports = [];
    const renderersImports = [];
    deps.forEach(function (dep) {
        if (dep.endsWith('Renderer')) {
            renderersImports.push(dep);
        }
        else if (CHARTS_MAP_REVERSE[dep]) {
            chartsImports.push(dep);
            if (includeType) {
                chartsImports.push(dep.replace(/Chart$/, 'SeriesOption'));
            }
        }
        else if (COMPONENTS_MAP_REVERSE[dep]) {
            componentsImports.push(dep);
            if (includeType) {
                componentsImports.push(dep.replace(/Component$/, 'ComponentOption'));
            }
        }
        else if (CHARTS_GL_MAP_REVERSE[dep]) {
            chartsGLImports.push(dep)
        }
        else if (COMPONENTS_GL_MAP_REVERSE[dep]) {
            componentsGLImports.push(dep);
        }
    });

    function getImportsPartCode(imports) {
        return `${imports.map(str => `
    ${str}`).join(',')}`;
    }

    const allImports = [
        ...componentsImports,
        ...chartsImports,
        ...componentsGLImports,
        ...chartsGLImports,
        ...renderersImports
    ];

    const ECOptionTypeCode = `
type ECOption = echarts.ComposeOption<
    ${allImports.filter(a => a.endsWith('Option')).join(' | ')}
>`;
    const importsCodes = [
        [componentsImports, 'echarts/components'],
        [chartsImports, 'echarts/charts'],
        [renderersImports, 'echarts/renderers'],
        [chartsGLImports, 'echarts-gl/charts'],
        [componentsGLImports, 'echarts-gl/components']
    ].filter(a => a[0].length > 0).map(item => `
import {${getImportsPartCode(item[0])}
} from '${item[1]}';
    `.trim()).join('\n');

    return `import * as echarts from 'echarts/core';
${importsCodes}

echarts.use(
    [${allImports.filter(a => !a.endsWith('Option')).join(', ')}]
);
` + (includeType ? ECOptionTypeCode : '')
}

module.exports.buildMinimalImportCode = buildMinimalImportCode;

function buildLegacyMinimalImportCode(deps, isESM) {
    const modules = [];
    deps.forEach(function (dep) {
        if (dep.endsWith('Renderer') && dep !== 'CanvasRenderer') {
            modules.push(`zrender/lib/${RENDERERS_MAP_REVERSE[dep]}/${RENDERERS_MAP_REVERSE[dep]}`);
        }
        else if (CHARTS_MAP_REVERSE[dep]) {
            modules.push(`echarts/lib/chart/${CHARTS_MAP_REVERSE[dep]}`);
        }
        else if (COMPONENTS_MAP_REVERSE[dep]) {
            modules.push(`echarts/lib/component/${COMPONENTS_MAP_REVERSE[dep]}`);
        }
        else if (CHARTS_GL_MAP_REVERSE[dep]) {
            modules.push(`echarts-gl/lib/chart/${CHARTS_GL_MAP_REVERSE[dep]}`);
        }
        else if (COMPONENTS_GL_MAP_REVERSE[dep]) {
            modules.push(`echarts-gl/lib/component/${COMPONENTS_GL_MAP_REVERSE[dep]}`);
        }
    });

    return isESM ? `import * as echarts from 'echarts/lib/echarts';
${modules.map(mod => {
    return `import '${mod}';`;
}).join('\n')}
` : `const echarts = require('echarts/lib/echarts');
${modules.map(mod => {
    return `require('${mod}');`;
}).join('\n')}
`
}

function hasGLInDeps(deps) {
    return !!deps.find(dep => !!(CHARTS_GL_MAP_REVERSE[dep] || COMPONENTS_GL_MAP_REVERSE[dep]));
}

module.buildLegacyMinimalImportCode = buildLegacyMinimalImportCode;

module.exports.buildExampleCode = function (
    jsCode, deps, {
        // If enable minimal import
        minimal,
        // If is ESM module or CommonJS module
        // Force to be true in ts mode or minimal mode.
        esm = true,
        // If use legacy minimal import, like:
        // import 'echarts/lib/chart/bar';
        // Only available when minimal is true.
        legacy,
        // If is ts code
        ts,
        // Theme
        theme,
        ROOT_PATH
    }
) {
    // if (minimal && !legacy) {
    //     // ESM must be used when use the new minimal import
    //     esm = true;
    // }

    if (ts) {
        esm = true;
    }

    if (minimal && !esm) {
        // Only legacy mode can be used when use require in mimimal bundle.
        legacy = true;
    }


    const hasECStat = jsCode.indexOf('ecStat') >= 0;
    const usedRootPath = jsCode.indexOf('ROOT_PATH') >= 0;
    const usedApp = jsCode.indexOf('app') >= 0;

    const DEP_CODE = `
${hasECStat ?
    esm ? `import ecStat from 'echarts-stat';`
        : `var ecStat = require('echarts-stat');`
    : ''
}
`;
    const IMPORT_CODE = [
        !minimal
            ? esm
                ? `import * as echarts from 'echarts';${hasGLInDeps(deps) ? `\nimport 'echarts-gl';` : ''}`
                : `var echarts = require('echarts');${hasGLInDeps(deps) ? `\nrequire('echarts-gl');` : ''}`
            : legacy
                ? buildLegacyMinimalImportCode(deps, esm)
                : buildMinimalImportCode(deps, ts),
        (theme && theme !== 'dark')
            ? esm
                ? `import 'echarts/theme/${theme}'`
                : `require('echarts/theme/${theme}')`
            : ''
    ].filter(a => !!a).join('\n');

    const ENV_CODE = [
        usedRootPath ? `var ROOT_PATH = '${ROOT_PATH}';` : '',
        usedApp ? `var app${ts ? ': any' : ''} = {};` : '',
        ts && !minimal ? 'type ECOption = echarts.EChartsOption' : ''
    ].filter(a => !!a).join('\n');

    const PREPARE_CODE = [
        IMPORT_CODE.trim(), DEP_CODE.trim(), ENV_CODE.trim()
    ].filter(a => !!a).join('\n\n');

    return `${PREPARE_CODE}

var chartDom = document.getElementById('main')${ts ? '!' : ''};
var myChart = echarts.init(chartDom${theme ? `, '${theme}'` : ''});
var option${ts ? ': ECOption' : ''};

${jsCode.trim()}

option && myChart.setOption(option);
`;
}