import {
  SFNClient,
  SendTaskFailureCommand,
  SendTaskSuccessCommand
} from '@aws-sdk/client-sfn'

const sfn = new SFNClient({})

export const sendTaskSuccess = async (taskToken: string) => {
  try {
    const command = new SendTaskSuccessCommand({
      taskToken,
      output: JSON.stringify({ success: true })
    })

    return await sfn.send(command)
  } catch (error) {
    console.error(error)
    const command = new SendTaskFailureCommand({
      taskToken
    })
    await sfn.send(command)
    throw error
  }
}
