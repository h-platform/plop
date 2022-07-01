import { NodePlopAPI } from 'plop';
export default function (plop: NodePlopAPI) {
    plop.setGenerator('command', {
        description: 'generate a command with http post handler',
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
            path: 'src/{{module}}/commands/{{topic}}.ts',
            templateFile: '../templates/commands/command.http.hbs'
        }, {
            type: 'add',
            path: 'src/{{module}}/commands/_index.ts',
            skipIfExists: true,
            templateFile: '../templates/commands/_index.hbs'
        }, {
            type: 'append',
            path: 'src/{{module}}/commands/_index.ts',
            pattern: '*** import section ***',
            template: 'import { {{ properCase topic}}Command } from "./{{topic}}";',
        }, {
            type: 'append',
            path: 'src/{{module}}/commands/_index.ts',
            pattern: '*** handlers section ***',
            template: '\t{{ properCase topic}}Command,',
        }]
    });

    plop.setGenerator('command.save', {
        description: 'generate a save command with http post handler',
        prompts: [{
            type: 'input',
            name: 'module',
            message: 'module?'
        }, {
            type: 'input',
            name: 'entity',
            message: 'entityName?'
        }],
        actions: [{
            type: 'add',
            path: 'src/{{module}}/commands/{{entity}}.save.ts',
            templateFile: './templates/commands/save.command.http.hbs'
        }, {
            type: 'add',
            path: 'src/{{module}}/commands/_index.ts',
            skipIfExists: true,
            templateFile: './templates/commands/_index.hbs'
        }, {
            type: 'append',
            path: 'src/{{module}}/commands/_index.ts',
            pattern: '*** import section ***',
            template: 'import { {{ properCase entity}}SaveCommand } from "./{{entity}}.save";',
        }, {
            type: 'append',
            path: 'src/{{module}}/commands/_index.ts',
            pattern: '*** handlers section ***',
            template: '\t{{ properCase entity}}SaveCommand,',
        }]
    });
};