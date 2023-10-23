import { CodePipelineEvent } from 'aws-lambda'
import { sendJobResult } from '../lib/codepipeline'
import { sendTaskSuccess } from '@npm-audit/core/sfn'

/**
 * The above function is an async handler that logs the event, retrieves the task token and job ID from
 * the event, sends a task success response if successful, sends a job result based on the response,
 * and logs and throws any errors encountered.
 * @param event - The `event` parameter is of type `CodePipelineEvent`, which
 * represents the event data received from AWS CodePipeline. It contains information about the current
 * job being executed in the pipeline.
 */
export async function handler(event: CodePipelineEvent) {
  console.log(JSON.stringify(event))

  const taskToken =
    event['CodePipeline.job'].data.actionConfiguration.configuration
      .UserParameters
  const jobId = event['CodePipeline.job'].id
  try {
    const response = await sendTaskSuccess(taskToken)
    if (response && response.$metadata.httpStatusCode === 200) {
      await sendJobResult(jobId, true)
    } else {
      await sendJobResult(jobId, false)
    }
  } catch (error) {
    console.log(error)
    throw error
  }
}
