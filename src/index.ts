import { NodePlopAPI } from 'plop';

export default function (plop: NodePlopAPI) {
    plop.load('./client.plop')
    plop.load('./command.plop')
    plop.load('./query.plop')
};
