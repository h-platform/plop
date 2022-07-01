import { NodePlopAPI } from 'plop';
export default function (plop: NodePlopAPI) {
    plop.setGenerator('query', {
        description: 'generate a query with http post handler',
        prompts: [{
            type: 'input',
            name: 'module',
            message: 'module name please'
        }, {
            type: 'input',
            name: 'topic',
            message: 'topic name please'
        }],
        actions: [{
            type: 'add',
            path: 'src/{{module}}/queries/{{topic}}.ts',
            templateFile: './templates/queries/query.http.hbs'
        }, {
            type: 'add',
            path: 'src/{{module}}/queries/_index.ts',
            skipIfExists: true,
            templateFile: './templates/queries/_index.hbs'
        }, {
            type: 'append',
            path: 'src/{{module}}/queries/_index.ts',
            pattern: '*** import section ***',
            template: 'import { {{ properCase topic}}Query } from "./{{topic}}";',
        }, {
            type: 'append',
            path: 'src/{{module}}/queries/_index.ts',
            pattern: '*** handlers section ***',
            template: '\t{{ properCase topic}}Query,',
        }]
    });

    plop.setGenerator('query.findAll', {
        description: 'generate a query with http post handler',
        prompts: [{
            type: 'input',
            name: 'module',
            message: 'module name please'
        }, {
            type: 'input',
            name: 'topic',
            message: 'topic name please',
            default: 'findAll',
        }, {
            type: 'input',
            name: 'entity',
            message: 'entity name please'
        }],
        actions: [{
            type: 'add',
            path: 'src/{{module}}/queries/{{entity}}.{{topic}}.ts',
            templateFile: './templates/queries/findAll.query.http.hbs'
        }, {
            type: 'add',
            path: 'src/{{module}}/queries/_index.ts',
            skipIfExists: true,
            templateFile: './templates/queries/_index.hbs'
        }, {
            type: 'append',
            path: 'src/{{module}}/queries/_index.ts',
            pattern: '*** import section ***',
            template: 'import { {{ properCase entity}}{{ properCase topic}}Query } from "./{{entity}}.{{topic}}";',
        }, {
            type: 'append',
            path: 'src/{{module}}/queries/_index.ts',
            pattern: '*** handlers section ***',
            template: '\t{{ properCase entity}}{{ properCase topic}}Query,',
        }]
    });

    plop.setGenerator('query.findById', {
        description: 'generate a query with http post handler',
        prompts: [{
            type: 'input',
            name: 'module',
            message: 'module name please'
        }, {
            type: 'input',
            name: 'topic',
            message: 'topic name please',
            default: 'findById',
        }, {
            type: 'input',
            name: 'entity',
            message: 'entity name please'
        }],
        actions: [{
            type: 'add',
            path: 'src/{{module}}/queries/{{entity}}.{{topic}}.ts',
            templateFile: './templates/queries/findById.query.http.hbs'
        }, {
            type: 'add',
            path: 'src/{{module}}/queries/_index.ts',
            skipIfExists: true,
            templateFile: './templates/queries/_index.hbs'
        }, {
            type: 'append',
            path: 'src/{{module}}/queries/_index.ts',
            pattern: '*** import section ***',
            template: 'import { {{ properCase entity}}{{properCase topic}}Query } from "./{{entity}}.{{topic}}";',
        }, {
            type: 'append',
            path: 'src/{{module}}/queries/_index.ts',
            pattern: '*** handlers section ***',
            template: '\t{{ properCase entity}}{{properCase topic}}Query,',
        }]
    });
};