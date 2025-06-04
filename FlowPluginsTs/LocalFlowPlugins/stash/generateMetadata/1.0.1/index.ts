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
  const fileDir = getFileAbosluteDir(args.inputFileObj._id);
  let sceneIDs: string[] = [];

  const requestConfig = {
    method: 'post',
    url: requestUrl,
    headers: {
      'Content-Type': 'application/json',
      ApiKey: apiKey,
    },
    // eslint-disable-next-line max-len
    data: JSON.stringify({
      query: `{
        findScenesByPathRegex(
          filter: {q: "${fileDir}"}
        ) {
          count
          scenes {
            id
          }
        }
      }`
    }),
  };

  try {
    const res = await args.deps.axios(requestConfig);
    args.jobLog(`Sending web request to: ${JSON.stringify(requestConfig)}`);

    if (res.status !== 200) {
      throw new Error(`Request failed with status code ${res.status}`);
    }

    args.jobLog(`Response: ${JSON.stringify(res.data)}`);
    const { count, scenes } = res.data.data.findScenesByPathRegex;

    args.jobLog(`Found ${count} scenes: ${scenes}`);
    if (count > 0) {
      sceneIDs = scenes.map((scene: { id: string }) => scene.id);
    }

  } catch (err) {
    args.jobLog('Web Request Failed');
    args.jobLog(JSON.stringify(err));
    throw new Error('Web Request Failed');
  }

  let query: string;
  if (allFiles) {
    query = 'mutation { metadataGenerate(input: {covers: true, markers: true, clipPreviews: true, phashes: true, sprites: true, markerScreenshots: true}) }';
  } else {
    query = `mutation { metadataGenerate(input: {sceneIDs: ${JSON.stringify(sceneIDs)}, covers: true, markers: true, clipPreviews: true, phashes: true, sprites: true, markerScreenshots: true}) }`;
  }
  requestConfig.data = JSON.stringify({ query });

  let jobId: number;
  try {
    const res = await args.deps.axios(requestConfig);
    if (res.status !== 200) {
      throw new Error(`Request failed with status code ${res.status}`);
    }
    args.jobLog(`Sending web request to: ${JSON.stringify(requestConfig)}`);

    jobId = res.data.data.metadataGenerate;
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
