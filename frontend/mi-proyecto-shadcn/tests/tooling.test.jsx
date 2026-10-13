import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InterfazDuenio from '../src/pages/InterfazDuenio/InterfazDuenio.jsx'

it('carga JSX, recursos y el panel existente con jsdom y React Testing Library', async () => {
  const user = userEvent.setup()
  render(<InterfazDuenio />)
  expect(screen.getByRole('heading', { name: 'Dueño' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Activar modo oscuro' }))
  expect(screen.getByRole('button', { name: 'Activar modo claro' })).toHaveAttribute('aria-pressed', 'true')
})
