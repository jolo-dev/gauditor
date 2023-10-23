import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../src/list-repositories'
import * as commit from '../lib/codecommit'

vi.mock('@npm-audit/core/codecommit', () => {
  return {
    listRepositories: vi.fn()
  }
})

describe('list-repositories', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })
  it('should call the handler', async () => {
    const codecommitSpy = vi.spyOn(commit, 'listRepositories')
    await handler()
    expect(codecommitSpy).toHaveBeenCalled()
  })

  it('should throw when handler has error', async () => {
    vi.spyOn(commit, 'listRepositories').mockRejectedValueOnce(
      new Error('Error listing repositories')
    )
    await expect(handler()).rejects.toThrowError('Error listing repositories')
  })
})
