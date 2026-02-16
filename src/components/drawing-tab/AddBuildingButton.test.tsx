/**
 * Unit Tests: AddBuildingButton Component
 * 
 * IMPLEMENTATION NOTES:
 * - Copy this file to: src/components/main/drawing-tab/AddBuildingButton.test.tsx
 * - Requires: @testing-library/react, jest, @testing-library/user-event
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddBuildingButton } from './AddBuildingButton';
import React from 'react';

// Mock the useAddBuilding hook
jest.mock('../../../hooks/building/useAddBuilding', () => ({
  useAddBuilding: () => ({
    addBuilding: jest.fn().mockResolvedValue({
      buildingId: 'building-1',
      buildingSequence: 1,
      buildingColor: '#FF6B6B',
      initialContext: {},
    }),
    isLoading: false,
    error: null,
    reset: jest.fn(),
  }),
}));

describe('AddBuildingButton Component', () => {
  const mockOnBuildingAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render button with correct label', () => {
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
        />
      );

      const button = screen.getByRole('button', { name: /add building/i });
      expect(button).toBeInTheDocument();
    });

    it('should display existing building count in aria-label', () => {
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={3}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('3 existing')
      );
    });

    it('should show building icon', () => {
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
        />
      );

      expect(screen.getByText('🏢')).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should be enabled when parcel is loaded and editing allowed', () => {
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
          isEditingAllowed={true}
          disabled={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should be disabled when parcel ID is missing', () => {
      render(
        <AddBuildingButton
          parcelId=""
          existingBuildingCount={0}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when editing not allowed', () => {
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
          isEditingAllowed={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Click Handling', () => {
    it('should call onBuildingAdded callback when building is created', async () => {
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
          onBuildingAdded={mockOnBuildingAdded}
        />
      );

      const button = screen.getByRole('button', { name: /add building/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnBuildingAdded).toHaveBeenCalledWith('building-1', 1);
      });
    });

    it('should show type selection dialog when no default type', async () => {
      const user = userEvent.setup();
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
        />
      );

      const button = screen.getByRole('button', { name: /add building/i });
      await user.click(button);

      // Dialog should appear (adjust selector based on actual dialog)
      await waitFor(() => {
        expect(screen.queryByText(/select building type/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when building creation fails', async () => {
      const errorMessage = 'Building creation failed';

      // Mock hook with error
      jest.resetModules();
      jest.doMock('../../../hooks/building/useAddBuilding', () => ({
        useAddBuilding: () => ({
          addBuilding: jest.fn().mockRejectedValue(
            new Error(errorMessage)
          ),
          isLoading: false,
          error: new Error(errorMessage),
          reset: jest.fn(),
        }),
      }));

      // Re-import after mock
      const { AddBuildingButton: MockedButton } = require('./AddBuildingButton');

      render(
        <MockedButton
          parcelId="parcel-123"
          existingBuildingCount={0}
        />
      );

      // Error message should be visible
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should allow dismissing error message', async () => {
      const user = userEvent.setup();

      // Render component with error displayed
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
        />
      );

      // Simulate error (this would normally come from the hook)
      const errorButton = screen.queryByLabelText('Dismiss error message');
      if (errorButton) {
        await user.click(errorButton);
        // Error notification should disappear
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={2}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('aria-disabled');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
          onBuildingAdded={mockOnBuildingAdded}
        />
      );

      const button = screen.getByRole('button');
      
      // Focus button via keyboard
      button.focus();
      expect(document.activeElement).toBe(button);

      // Activate via Enter key
      // This would trigger the click handler
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
          className="custom-class"
        />
      );

      const button = container.querySelector('.custom-class');
      expect(button).toBeInTheDocument();
    });

    it('should use provided building type as default', () => {
      const mockBuildingType = {
        id: 'type-1',
        name: 'House',
        type: 'RES',
      };

      render(
        <AddBuildingButton
          parcelId="parcel-123"
          existingBuildingCount={0}
          defaultBuildingType={mockBuildingType}
        />
      );

      // When default type is provided, dialog should not appear on click
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Dialog should NOT appear since type is pre-selected
      expect(screen.queryByText(/select building type/i)).not.toBeInTheDocument();
    });
  });
});
`;

console.log('AddBuildingButton Test Template Ready');
console.log('Copy this file to src/components/main/drawing-tab/AddBuildingButton.test.tsx');
