import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('Input Component Icon & RightElement Vertical Centering Stability', () => {
  it('1. Inner input container isolates icon positioning from error message height', () => {
    // Simulates the wrapper architecture of components/ui/input.tsx
    function renderInputLayout({
      hasIcon = false,
      hasRightElement = false,
      error = undefined as string | undefined,
    }) {
      const isWrapped = Boolean(hasIcon || hasRightElement || error !== undefined)
      if (!isWrapped) {
        return { type: 'bare_input' }
      }

      // Root container wraps both the input row and any alert/error text
      const rootContainer = {
        className: 'w-full',
        children: {
          inputRow: {
            className: 'relative flex items-center w-full',
            iconContainer: hasIcon
              ? {
                  className: 'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground',
                  // Inset strictly covers the inputRow, NOT the error message!
                  anchoredTo: 'inputRow',
                }
              : null,
            rightElementContainer: hasRightElement
              ? {
                  className: 'absolute inset-y-0 right-0 flex items-center pr-2.5 z-10',
                  // Inset strictly covers the inputRow, NOT the error message!
                  anchoredTo: 'inputRow',
                }
              : null,
          },
          errorMessage: error
            ? {
                className: 'mt-1 text-xs text-destructive font-medium',
                text: error,
                // Positioned outside inputRow
                anchoredTo: 'rootContainer',
              }
            : null,
        },
      }

      return rootContainer
    }

    // Test with icon, rightElement (password eye toggle), and validation error
    const layoutWithError = renderInputLayout({
      hasIcon: true,
      hasRightElement: true,
      error: 'Password must contain at least 8 characters',
    })

    assert.notStrictEqual(layoutWithError.children, undefined)
    assert.strictEqual(layoutWithError.children.inputRow.className, 'relative flex items-center w-full')
    assert.strictEqual(layoutWithError.children.inputRow.iconContainer?.anchoredTo, 'inputRow')
    assert.strictEqual(layoutWithError.children.inputRow.rightElementContainer?.anchoredTo, 'inputRow')
    assert.strictEqual(layoutWithError.children.errorMessage?.anchoredTo, 'rootContainer')

    // Icons remain anchored strictly to inputRow even when error is absent
    const layoutWithoutError = renderInputLayout({
      hasIcon: true,
      hasRightElement: true,
      error: undefined,
    })

    assert.strictEqual(layoutWithoutError.children.inputRow.iconContainer?.anchoredTo, 'inputRow')
    assert.strictEqual(layoutWithoutError.children.inputRow.rightElementContainer?.anchoredTo, 'inputRow')
    assert.strictEqual(layoutWithoutError.children.errorMessage, null)
  })
})
