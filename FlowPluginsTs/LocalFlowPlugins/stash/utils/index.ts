import { IpluginInputArgs } from "../../../FlowHelpers/1.0.0/interfaces/interfaces";

export function wait(waitTime: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, waitTime));
}

export async function waitForJobCompletion(jobId: number, args: IpluginInputArgs): Promise<void> {
  const { requestUrl, apiKey } = parseArgs(args);

  while (true) {
    const requestConfig = {
      method: 'post',
      url: requestUrl,
      headers: {
        'Content-Type': 'application/json',
        ApiKey: apiKey,
      },
      // eslint-disable-next-line max-len
      data: JSON.stringify({ query: `query { findJob(input: { id: "${jobId}"} ) { status } }` }),
    };

    try {
      const res = await args.deps.axios(requestConfig);
      const jobStatus = res.data.data.findJob.status;
      args.jobLog(`Job status: ${jobStatus}`);
      
      if (jobStatus === 'COMPLETED' || jobStatus === 'FAILED') {
        return;
      }
      await wait(500); // Wait for 5 seconds before checking the job status again
    } catch (err) {
      args.jobLog('Job status request failed');
      args.jobLog(JSON.stringify(err));
      throw new Error('Job status request failed');
    }
  }
}

export type Parameters = {
  requestUrl: string;
  apiKey: string;
  allFiles: boolean;
};

export function parseArgs(args: IpluginInputArgs): Parameters {
  const { requestUrl, apiKey, allFiles } = args.inputs;

  return {
    requestUrl: requestUrl as string,
    apiKey: apiKey as string,
    allFiles: allFiles as boolean
  };
}