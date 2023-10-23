import {
  CodeCommitClient,
  ListRepositoriesCommand
} from '@aws-sdk/client-codecommit'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { throwExpression } from './utilty'

const client = new STSClient({})

/**
 * Why? Because often the accounts need to do cross-account access to other AWS accounts
 * The function `getCredentials` takes an AWS IAM role ARN as input, assumes the role using AWS STS,
 * and returns the temporary credentials (access key, secret access key, and session token) associated
 * with the assumed role.
 * @param assumeRoleArn - The `assumeRoleArn` parameter is the Amazon Resource Name (ARN) of
 * the role that you want to assume. This ARN uniquely identifies the role and specifies its location
 * in AWS.
 * @returns The function `getCredentials` returns an object with the following properties:
 */
export const getCredentials = async (assumeRoleArn: string) => {
  const assume = new AssumeRoleCommand({
    // The Amazon Resource Name (ARN) of the role to assume.
    RoleArn: assumeRoleArn,
    // An identifier for the assumed role session.
    RoleSessionName: 'abcdefghijklmnopqrstuvwxyz',
    // The duration, in seconds, of the role session. The value specified
    // can range from 900 seconds (15 minutes) up to the maximum session
    // duration set for the role.
    DurationSeconds: 900
  })
  const roleCredentials = await client.send(assume)

  if (
    !roleCredentials.Credentials?.AccessKeyId ||
    !roleCredentials.Credentials?.SecretAccessKey ||
    !roleCredentials.Credentials?.SessionToken
  ) {
    throw Error('No credentials returned from STS')
  } else {
    return {
      accessKeyId: roleCredentials.Credentials.AccessKeyId,
      secretAccessKey: roleCredentials.Credentials.SecretAccessKey,
      sessionToken: roleCredentials.Credentials.SessionToken
    }
  }
}

export const listRepositories = async (assumeRoleArn: string) => {
  try {
    const roleCredentials = await getCredentials(assumeRoleArn)

    const codeCommitClient = new CodeCommitClient({
      credentials: {
        accessKeyId: roleCredentials.accessKeyId,
        secretAccessKey: roleCredentials.secretAccessKey,
        sessionToken: roleCredentials.sessionToken
      }
    })

    const listReposCommand = new ListRepositoriesCommand({})

    const response = await codeCommitClient.send(listReposCommand)
    return response.repositories
      ? response.repositories
          .filter(
            (repo) =>
              repo.repositoryName?.includes('de.ves.pt') &&
              !repo.repositoryName?.includes('npm-audit') &&
              !repo.repositoryName?.includes('docs')
          )
          .map((repo) => `${repo.repositoryName}`) // to get the repository name as string
      : throwExpression('No repositories found.')
  } catch (err) {
    console.error(err)
    throw err
  }
}
