describe('environment test', () => {
  it('1 + 1 need be 2', () => {
    expect(1 + 1).toBe(2)
  })

  it('DOM environment available', () => {
    const div = document.createElement('div')
    div.textContent = 'hello'
    expect(div.textContent).toBe('hello')
  })
})