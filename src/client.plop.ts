import { NodePlopAPI } from 'plop';
import { writeFile, readFile } from 'node:fs/promises';
import { uniq } from 'lodash';
import assert from 'assert';
import { pascalCase } from "pascal-case";

const glob = require("glob")
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const XRegExp = require('xregexp')
interface CQRecord {
    recordType: 'QUERY' | 'COMMAND',
    file: string,
    moduleName: string,
    eventName: string,
    dtoClassName: string,
}

function promisedGlob(pattern: string) {
    return new Promise<string[]>((resolve, reject) => {
        glob(pattern, (err: any, files: string[]) => {
            if (err) { reject(err) }
            resolve(files);
        })
    })
}

function promisedRimraf(dirName: string) {
    return new Promise<any>((resolve, reject) => {
        rimraf(dirName, {}, (err: any) => {
            if (err) { reject(err) }
            resolve(true);
        })
    })
}

async function processCommandFile(filePath: string) {
    try {
        const commandDTORegex = new RegExp(/.*CommandDTO {[\s\S]*}/);
        const code = await readFile(filePath);
        const res1 = commandDTORegex.exec(code.toLocaleString());
        if (Array.isArray(res1)) {
            const [before, left, match, right] = XRegExp.matchRecursive(res1, '{', '}', 'g', {
                valueNames: ['before', 'left', 'match', 'right'],
                unbalanced: 'skip',
            });
            const dtoClass = [before.value, left.value, match.value, right.value].join('');
            return dtoClass;
        } else {
            throw new Error('CommandDTO not found in file')
        }
    } catch (err) {
        console.log('// Error occured during Command DTO Extraction')
        console.log('// Error file: ' + filePath)
        console.log(err);
        return null;
    }
}


async function processQueryFile(filePath: string) {
    try {
        const queryDTORegex = new RegExp(/.*QueryDTO {[\s\S]*}/);
        const code = await readFile(filePath);
        const res1 = queryDTORegex.exec(code.toLocaleString());
        if (Array.isArray(res1)) {
            const [before, left, match, right] = XRegExp.matchRecursive(res1[0], '{', '}', 'g', {
                valueNames: ['before', 'left', 'match', 'right'],
                unbalanced: 'skip',
            });
            const dtoClass = [before.value, left.value, match.value, right.value].join('');
            return dtoClass;
        } else {
            throw new Error('CommandDTO not found in file')
        }
    } catch (err) {
        console.log('// Error occured during Query DTO Extraction')
        console.log('// Error file: ' + filePath)
        console.log(err);
        return null;
    }
}

function prepareDtoTemplate(code: string) {
    return `import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsDefined, IsString, Matches, IsNotEmpty } from 'class-validator';

${code}`
}

function prepareModuleClientTemplate(moduleName: string, records: CQRecord[]) {
    const commandsDtos = records.filter(r => r.moduleName == moduleName && r.recordType == 'COMMAND');
    const queriesDtos = records.filter(r => r.moduleName == moduleName && r.recordType == 'QUERY');
    const commandsImports = commandsDtos.map(d => `import { ${d.dtoClassName} } from "./commands/${d.eventName}";`);
    const queriesImports = queriesDtos.map(d => `import { ${d.dtoClassName} } from "./queries/${d.eventName}";`);
    const commandsList = commandsDtos.map(d => `        '${d.eventName}': ${d.dtoClassName},`);
    const queriesList = queriesDtos.map(d => `        '${d.eventName}': ${d.dtoClassName},`);

    return `import { HModuleConfigs } from "@h-platform/cqm";
${commandsImports.join('\n')}
${queriesImports.join('\n')}

export class ${pascalCase(moduleName)}Client implements HModuleConfigs {
    moduleName: '${moduleName}';
    commands: {
${commandsList.join('\n')}
    };
    queries: {
${queriesList.join('\n')}
    };
}
`}


function prepareClientTemplate(moduleNames: string[]) {
    const imports = moduleNames.map(m => `import { ${pascalCase(m)}Client } from "./${m}/index";`);
    const list = moduleNames.map(m => `    '${m}': ${pascalCase(m)}Client,`);
    return `
import { CQClient, HModuleConfigs } from "@h-platform/cqm";
${imports.join('\n')}

interface ModuleClient {
${list.join('\n')}
}

export async function command<
        TModule extends keyof ModuleClient,
        TCommand extends keyof ModuleClient[TModule]['commands'],
        TPayload extends ModuleClient[TModule]['commands'][TCommand],
    >(cqclient: CQClient, mn: TModule, cmd: TCommand, payload: TPayload) {
    return cqclient.command(mn, cmd, payload);
};

export async function query<
        TModule extends keyof ModuleClient,
        TQuery extends keyof ModuleClient[TModule]['queries'],
        TPayload extends ModuleClient[TModule]['queries'][TQuery],
    >(cqclient: CQClient, mn: TModule, cmd: TQuery, payload: TPayload) {
    return cqclient.query(mn, cmd, payload);
};
`
}

export default function (plop: NodePlopAPI) {

    plop.setActionType('httpClientScanCommandsSrcModules', async (answers, config, plop) => {
        // scan commads
        const commandRecords: CQRecord[] = [];
        const cmdRegex = /^src\/(.*)\/commands\/(.*).ts$/;
        const commands = await promisedGlob("src/*/commands/!(_)*.ts");
        for (let file of commands) {
            if (cmdRegex.test(file)) {
                const res = cmdRegex.exec(file);
                if (Array.isArray(res)) {
                    const [, mn, cmd] = res;
                    const record: CQRecord = {
                        file: file,
                        moduleName: mn,
                        eventName: cmd,
                        recordType: 'COMMAND',
                        dtoClassName: 'CommandDTO',
                    }
                    const dtoClassCode = await processCommandFile(file);
                    if (dtoClassCode) {
                        const res = /(\w+CommandDTO)/.exec(dtoClassCode);
                        if (Array.isArray(res) && res[1]) {
                            record.dtoClassName = res[1];
                        }
                    }
                    commandRecords.push(record)
                }
            }
        }

        answers.data = [...(answers.data || []), ...commandRecords];

        return 'Commands scanned successfully'
    });

    plop.setActionType('httpClientScanQueriesSrcModules', async (answers, config, plop) => {
        // scan queries
        const queriesRecords: CQRecord[] = [];
        const queries = await promisedGlob("src/*/queries/!(_)*.ts")
        const qyrRegex = /^src\/(.*)\/queries\/(.*).ts$/;
        for (let file of queries) {
            if (qyrRegex.test(file)) {
                const res = qyrRegex.exec(file);
                if (Array.isArray(res)) {
                    const [, mn, cmd] = res;
                    const record: CQRecord = {
                        file: file,
                        moduleName: mn,
                        eventName: cmd,
                        recordType: 'QUERY',
                        dtoClassName: 'QueryDTO',
                    }
                    const dtoClassCode = await processQueryFile(file);
                    if (dtoClassCode) {
                        const res = /(\w+QueryDTO)/.exec(dtoClassCode);
                        if (Array.isArray(res) && res[1]) {
                            record.dtoClassName = res[1];
                        }
                    }
                    queriesRecords.push(record)
                }
            }
        }

        answers.data = [...(answers.data || []), ...queriesRecords];

        return 'queries scanned successfully';
    });

    plop.setActionType('httpClientPrepareFolders', async (answers, config, plop) => {
        // remove previous generated folder
        assert(Array.isArray(answers.data));
        const data: CQRecord[] = answers.data;
        const moduleNames = uniq(data.map((r) => r.moduleName));
        await promisedRimraf('src-client');
        for (let moduleName of moduleNames) {
            // prepare folders 
            await mkdirp(`src-client/${moduleName}/commands`)
            await mkdirp(`src-client/${moduleName}/queries`)
        }
        return 'Folders prepared successfully';
    });

    plop.setActionType('httpClientWriteCommands', async (answers, config, plop) => {
        assert(Array.isArray(answers.data));
        for (let record of answers.data.filter((r: CQRecord) => r.recordType === 'COMMAND')) {
            const dtoClassCode = await processCommandFile(record.file);
            if (dtoClassCode) {
                await writeFile(`src-client/${record.moduleName}/commands/${record.eventName}.ts`, prepareDtoTemplate(dtoClassCode))
            }
        }
        return 'CommandDTOs written success';
    });

    plop.setActionType('httpClientWriteQueries', async (answers, config, plop) => {
        assert(Array.isArray(answers.data));
        for (let record of answers.data.filter((r: CQRecord) => r.recordType === 'QUERY')) {
            const dtoClassCode = await processQueryFile(record.file);
            if (dtoClassCode) {
                await writeFile(`src-client/${record.moduleName}/queries/${record.eventName}.ts`, prepareDtoTemplate(dtoClassCode))
            }
        }
        return 'َQueryDTOs written success';
    });

    plop.setActionType('httpClientWriteModules', async (answers, config, plop) => {
        assert(Array.isArray(answers.data));
        const data: CQRecord[] = answers.data;
        const moduleNames = uniq(data.map((r) => r.moduleName));
        for (let moduleName of moduleNames) {
            // generate module index
            const moduleTemplate = prepareModuleClientTemplate(moduleName, data);
            await writeFile(`src-client/${moduleName}/index.ts`, moduleTemplate)
        }
        return 'success status message';
    });

    plop.setActionType('httpClientWriteClient', async (answers, config, plop) => {
        assert(Array.isArray(answers.data));
        const data: CQRecord[] = answers.data;
        const moduleNames = uniq(data.map((r) => r.moduleName));
        const clientTemplate = prepareClientTemplate(moduleNames)
        await writeFile(`src-client/index.ts`, clientTemplate);
        return 'success status message';
    });

    plop.setGenerator('client', {
        description: 'generate a query with http post handler',
        prompts: [],
        actions: [{
            type: 'httpClientScanCommandsSrcModules',
        }, {
            type: 'httpClientScanQueriesSrcModules',
        }, {
            type: 'httpClientPrepareFolders',
        }, {
            type: 'httpClientWriteCommands',
        }, {
            type: 'httpClientWriteQueries',
        }, {
            type: 'httpClientWriteModules',
        }, {
            type: 'httpClientWriteClient',
        }]
    });
};
