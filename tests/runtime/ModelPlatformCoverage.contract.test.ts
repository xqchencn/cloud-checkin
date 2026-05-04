import { describe, expect, it } from 'vitest'
import { __modelServiceTestHooks } from '../../worker/src/services/model-service'

/**
 * 模型平台解析测试
 * 验证不同平台的模型解析和端点候选
 */
describe('model platform parsing', () => {
  /**
   * 验证解析 OpenAI /v1/models 格式
   * 测试 OpenAI 格式的模型解析
   */
  it('parses OpenAI /v1/models shape', () => {
    expect(__modelServiceTestHooks.parseModels({ data: [{ id: 'gpt-4o' }, { id: 'claude-sonnet' }] }, 'openai')).toEqual(['gpt-4o', 'claude-sonnet'])
  })

  /**
   * 验证解析对象模型映射格式
   * 测试对象格式的模型解析
   */
  it('parses object model map shape', () => {
    expect(__modelServiceTestHooks.parseModels({ data: { 'gpt-4o': {}, 'claude-3-5': {} } }, 'object')).toEqual(['gpt-4o', 'claude-3-5'])
  })

  /**
   * 验证声明 OneApi 和 Veloera 主要模型端点为 /v1/models
   * 测试 OneApi 和 Veloera 平台的模型端点候选
   */
  it('declares OneApi and Veloera primary model endpoint as /v1/models', () => {
    expect(__modelServiceTestHooks.modelEndpointCandidates('OneApi')[0]).toBe('/v1/models')
    expect(__modelServiceTestHooks.modelEndpointCandidates('Veloera')[0]).toBe('/v1/models')
  })

  /**
   * 验证声明 OneHub 和 DoneHub 回退到可用模型映射
   * 测试 OneHub 和 DoneHub 平台的模型端点候选
   */
  it('declares OneHub and DoneHub fallback to available model map', () => {
    expect(__modelServiceTestHooks.modelEndpointCandidates('OneHub')).toEqual(['/v1/models', '/api/available_model'])
    expect(__modelServiceTestHooks.modelEndpointCandidates('DoneHub')).toEqual(['/v1/models', '/api/available_model'])
  })
})
