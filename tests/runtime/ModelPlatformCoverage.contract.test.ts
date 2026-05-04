import { describe, expect, it } from 'vitest'
import { __modelServiceTestHooks } from '../../worker/src/services/model-service'

describe('model platform parsing', () => {
  it('parses OpenAI /v1/models shape', () => {
    expect(__modelServiceTestHooks.parseModels({ data: [{ id: 'gpt-4o' }, { id: 'claude-sonnet' }] }, 'openai')).toEqual(['gpt-4o', 'claude-sonnet'])
  })

  it('parses object model map shape', () => {
    expect(__modelServiceTestHooks.parseModels({ data: { 'gpt-4o': {}, 'claude-3-5': {} } }, 'object')).toEqual(['gpt-4o', 'claude-3-5'])
  })

  it('declares OneApi and Veloera primary model endpoint as /v1/models', () => {
    expect(__modelServiceTestHooks.modelEndpointCandidates('OneApi')[0]).toBe('/v1/models')
    expect(__modelServiceTestHooks.modelEndpointCandidates('Veloera')[0]).toBe('/v1/models')
  })

  it('declares OneHub and DoneHub fallback to available model map', () => {
    expect(__modelServiceTestHooks.modelEndpointCandidates('OneHub')).toEqual(['/v1/models', '/api/available_model'])
    expect(__modelServiceTestHooks.modelEndpointCandidates('DoneHub')).toEqual(['/v1/models', '/api/available_model'])
  })
})
