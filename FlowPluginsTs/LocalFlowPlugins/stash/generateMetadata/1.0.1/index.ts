import { getFileAbosluteDir } from '../../../../FlowHelpers/1.0.0/fileUtils';
import {
  IpluginDetails,
  IpluginInputArgs,
  IpluginOutputArgs,
} from '../../../../FlowHelpers/1.0.0/interfaces/interfaces';
import { waitForJobCompletion } from '../../utils';

const lib = require('../../../../../methods/lib')();

/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = (): IpluginDetails => ({
  name: 'Generate Stash Metadata',
  description: 'Generate Stash Metadata',
  style: {
    borderColor: 'green',
  },
  tags: '',
  isStartPlugin: false,
  pType: '',
  requiresVersion: '2.11.01',
  sidebarPosition: -1,
  icon: 'faArrowRight',
  inputs: [
    {
      label: 'Stash GraphQL URL',
      name: 'requestUrl',
      type: 'string',
      defaultValue: 'http://localhost:9999/graphql',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Specify request URL',
    },
    {
      label: 'Stash API Key',
      name: 'apiKey',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Specify Stash API key',
    },
    {
      label: 'All Files?',
      name: 'allFiles',
      type: 'boolean',
      defaultValue: 'false',
      inputUI: {
        type: 'switch',
      },
      tooltip: `Specify whether to scan all paths or just the current file path`,
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: 'Continue to next plugin',
    },
  ],
});

const plugin = async (args: IpluginInputArgs): Promise<IpluginOutputArgs> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  const { requestUrl, apiKey, allFiles } = args.inputs;
  const fileDir = getFileAbosluteDir(args.inputFileObj._id).toLowerCase();

  args.jobLog(`File Directory: ${fileDir}`);

  const requestConfig = {
    method: 'post',
    url: requestUrl,
    headers: {
      'Content-Type': 'application/json',
      ApiKey: apiKey,
    },
    // eslint-disable-next-line max-len
    data: JSON.stringify({ query: `mutation { metadataGenerate(input: {paths: [${allFiles ? "" : JSON.stringify(fileDir)}]}) }` }),
  };

  let jobId: number;
  try {
    const res = await args.deps.axios(requestConfig);
    jobId = res.data.data.metadataGenerate;
    args.jobLog("Sending web request to: ".concat(JSON.stringify(requestConfig)));
  } catch (err) {
    args.jobLog('Web Request Failed');
    args.jobLog(JSON.stringify(err));
    throw new Error('Web Request Failed');
  }

  await waitForJobCompletion(jobId, args);

  return {
    outputFileObj: args.inputFileObj,
    outputNumber: 1,
    variables: args.variables,
  };
};
export {
  details,
  plugin,
};
