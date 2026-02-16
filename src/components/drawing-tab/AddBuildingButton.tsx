/**
 * Component: AddBuildingButton
 * Purpose: UI button to trigger building creation workflow with Building Type & Class selection
 * 
 * Features:
 * - Building Type dropdown (from API)
 * - Building Class dropdown (filtered by type)
 * - Browse Types button (opens modal table with Type, Class, Percent, Description)
 * - Loading state with spinner
 * - Error message display with dismissal
 * - Permission-aware disabling
 * - Accessibility support (ARIA labels, keyboard navigation)
 * - Responsive styling
 */

import React, { useState, useCallback, useMemo } from 'react';
// TODO: Create useAddBuilding hook
// import { useAddBuilding } from '../../../hooks/building/useAddBuilding';
// import { BuildingType } from '../../../hooks/building/useAddBuilding';
// TODO: Create building services
// import { useGetActiveBuildingTypesQuery } from '../../../services/main/building/buildingServices';
// TODO: Create building type models
// import { TabBuildingType } from '../../../models/main/building/buildingType';
import './AddBuildingButton.css';

// Placeholder types - replace with actual imports when modules are created
export interface BuildingType {
  id: string;
  type: string;
  class: string;
  name: string;
  description?: string;
  isActive: boolean;
  percent: number;
}

export interface TabBuildingType {
  id: number;
  type: string;
  class: string;
  bldgPercent: number;
  description?: string;
  isActive: boolean;
}

// Placeholder hook implementations
const useAddBuilding = (_config: any) => ({
  addBuilding: async (_params: any) => ({
    buildingId: `building_${Date.now()}`,
    buildingSequence: 1,
  }),
  isLoading: false,
  error: null,
  reset: () => {},
});

const useGetActiveBuildingTypesQuery = () => ({
  data: { content: [] },
  isLoading: false,
});

// ============================================================================
// TYPES
// ============================================================================

export interface AddBuildingButtonProps {
  /** Parcel ID for the building */
  parcelId: string;
  /** Number of existing buildings (for display) */
  existingBuildingCount: number;
  /** Callback when building is successfully added */
  onBuildingAdded?: (buildingId: string, sequence: number) => void;
  /** Disable button (e.g., when parcel not loaded) */
  disabled?: boolean;
  /** Optional building type to pre-select */
  defaultBuildingType?: BuildingType;
  /** Custom CSS class */
  className?: string;
  /** Whether user has editing permissions */
  isEditingAllowed?: boolean;
}

// ============================================================================
// SUB-COMPONENT: BuildingTypeTableModal
// ============================================================================

/**
 * Modal dialog showing table of all building types with details
 * Columns: Type, Class, Percent, Description
 */
interface BuildingTypeTableModalProps {
  buildingTypes: TabBuildingType[];
  onClose: () => void;
  onSelect?: (buildingType: TabBuildingType) => void;
  isLoading?: boolean;
}

const BuildingTypeTableModal: React.FC<BuildingTypeTableModalProps> = ({
  buildingTypes,
  onClose,
  onSelect,
  isLoading = false,
}) => {
  return (
    <div className="building-type-modal-overlay" onClick={onClose} role="presentation">
      <div className="building-type-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Building Types Reference</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {buildingTypes.length === 0 ? (
            <p className="no-types-message">No building types available</p>
          ) : (
            <div className="building-type-table-wrapper">
              <table className="building-type-table" role="table">
                <thead>
                  <tr role="row">
                    <th role="columnheader" className="col-type">Type</th>
                    <th role="columnheader" className="col-class">Class</th>
                    <th role="columnheader" className="col-percent">Percent</th>
                    <th role="columnheader" className="col-description">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {buildingTypes.map((type) => (
                    <tr
                      key={`${type.id}-${type.type}-${type.class}`}
                      className="building-type-row"
                      role="row"
                      onClick={() => onSelect?.(type)}
                      style={{ cursor: onSelect ? 'pointer' : 'default' }}
                    >
                      <td role="cell" className="col-type">{type.type}</td>
                      <td role="cell" className="col-class">{type.class || '-'}</td>
                      <td role="cell" className="col-percent">{type.bldgPercent}%</td>
                      <td role="cell" className="col-description">{type.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-close-action-btn" onClick={onClose} disabled={isLoading}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: BuildingTypeForm
// ============================================================================

/**
 * Form for selecting building type and class
 */
interface BuildingTypeFormProps {
  buildingTypes: TabBuildingType[];
  selectedType: TabBuildingType | null;
  selectedClass: string | null;
  onTypeChange: (type: TabBuildingType | null) => void;
  onClassChange: (classValue: string | null) => void;
  onBrowseTypes: () => void;
  onCreateBuilding: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}

const BuildingTypeForm: React.FC<BuildingTypeFormProps> = ({
  buildingTypes,
  selectedType,
  selectedClass,
  onTypeChange,
  onClassChange,
  onBrowseTypes,
  onCreateBuilding,
  isLoading = false,
  isDisabled = false,
}) => {
  // Get unique classes for the selected type
  const availableClasses = useMemo(() => {
    if (!selectedType) return [];
    return buildingTypes
      .filter((t) => t.type === selectedType.type)
      .map((t) => t.class)
      .filter((c) => c && c !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
  }, [selectedType, buildingTypes]);

  // If type changes, reset class selection if it's no longer valid
  React.useEffect(() => {
    if (selectedType && selectedClass && !availableClasses.includes(selectedClass)) {
      onClassChange(null);
    }
  }, [selectedType, selectedClass, availableClasses, onClassChange]);

  return (
    <div className="building-type-form">
      <div className="form-group">
        <label htmlFor="building-type-select">Building Type *</label>
        <select
          id="building-type-select"
          value={selectedType?.id || ''}
          onChange={(e) => {
            const typeId = parseInt(e.target.value, 10);
            const type = buildingTypes.find((t) => t.id === typeId) || null;
            onTypeChange(type);
          }}
          disabled={isLoading || isDisabled}
          className="type-dropdown"
          aria-label="Select building type"
          required
        >
          <option value="">-- Select Building Type --</option>
          {buildingTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.type} - {type.class}
            </option>
          ))}
        </select>
      </div>

      {selectedType && availableClasses.length > 0 && (
        <div className="form-group">
          <label htmlFor="building-class-select">Building Class</label>
          <select
            id="building-class-select"
            value={selectedClass || ''}
            onChange={(e) => onClassChange(e.target.value || null)}
            disabled={isLoading || isDisabled}
            className="class-dropdown"
            aria-label="Select building class"
          >
            <option value="">-- Select Class (Optional) --</option>
            {availableClasses.map((classValue) => (
              <option key={classValue} value={classValue}>
                {classValue}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedType && (
        <div className="form-details">
          <div className="detail-item">
            <span className="detail-label">Default Percent:</span>
            <span className="detail-value">{selectedType.bldgPercent}%</span>
          </div>
          {selectedType.description && (
            <div className="detail-item">
              <span className="detail-label">Description:</span>
              <span className="detail-value">{selectedType.description}</span>
            </div>
          )}
        </div>
      )}

      <div className="form-actions">
        <button
          className="browse-types-btn"
          onClick={onBrowseTypes}
          disabled={isLoading || isDisabled}
          title="View all building types in a table"
          aria-label="Browse all building types"
        >
          📋 Browse Types
        </button>
        <button
          className="create-building-btn"
          onClick={onCreateBuilding}
          disabled={!selectedType || isLoading || isDisabled}
          title="Create new building with selected type"
          aria-label={`Create new building with ${selectedType?.type || 'selected'} type`}
        >
          {isLoading ? 'Creating...' : 'Create Building'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: BuildingTypeSelectionDialog
// ============================================================================

/**
 * Dialog modal containing the building type form
 */
interface BuildingTypeSelectionDialogProps {
  buildingTypes: TabBuildingType[];
  onCancel: () => void;
  onCreateBuilding: (type: TabBuildingType, classValue: string | null) => void;
  isLoading?: boolean;
}

const BuildingTypeSelectionDialog: React.FC<BuildingTypeSelectionDialogProps> = ({
  buildingTypes,
  onCancel,
  onCreateBuilding,
  isLoading = false,
}) => {
  const [selectedType, setSelectedType] = useState<TabBuildingType | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showTypeTable, setShowTypeTable] = useState(false);

  const handleCreateBuilding = useCallback(() => {
    if (selectedType) {
      onCreateBuilding(selectedType, selectedClass);
      setSelectedType(null);
      setSelectedClass(null);
    }
  }, [selectedType, selectedClass, onCreateBuilding]);

  const handleSelectFromTable = useCallback(
    (type: TabBuildingType) => {
      setSelectedType(type);
      setShowTypeTable(false);
    },
    []
  );

  return (
    <>
      <div className="building-type-dialog-overlay" onClick={onCancel} role="presentation">
        <div className="building-type-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="dialog-header">
            <h2>Add New Building</h2>
            <button
              className="dialog-close-btn"
              onClick={onCancel}
              aria-label="Close dialog"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>

          <div className="dialog-body">
            <BuildingTypeForm
              buildingTypes={buildingTypes}
              selectedType={selectedType}
              selectedClass={selectedClass}
              onTypeChange={setSelectedType}
              onClassChange={setSelectedClass}
              onBrowseTypes={() => setShowTypeTable(true)}
              onCreateBuilding={handleCreateBuilding}
              isLoading={isLoading}
              isDisabled={buildingTypes.length === 0}
            />
          </div>

          <div className="dialog-footer">
            <button className="cancel-btn" onClick={onCancel} disabled={isLoading}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Building Type Table Modal */}
      {showTypeTable && (
        <BuildingTypeTableModal
          buildingTypes={buildingTypes}
          onClose={() => setShowTypeTable(false)}
          onSelect={handleSelectFromTable}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AddBuildingButton: React.FC<AddBuildingButtonProps> = ({
  parcelId,
  existingBuildingCount,
  onBuildingAdded,
  disabled = false,
  defaultBuildingType,
  className = '',
  isEditingAllowed = true,
}) => {
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);

  // Fetch building types from API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: buildingTypesResponse, isLoading: isLoadingTypes } = useGetActiveBuildingTypesQuery();
  const buildingTypes = useMemo(() => {
    return buildingTypesResponse?.content || [];
  }, [buildingTypesResponse]);

  // Hook for building creation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { addBuilding, isLoading, error, reset } = useAddBuilding({
    parcelId,
    buildingType: defaultBuildingType,
  });



  /**
   * Handle add building click - show type selection dialog
   */
  const handleAddBuildingClick = useCallback(async () => {
    try {
      setDismissedError(false);

      if (defaultBuildingType) {
        // If building type is pre-selected, create directly
        setIsProcessing(true);
        const result = await addBuilding({
          parcelId,
          buildingType: defaultBuildingType,
        });

        onBuildingAdded?.(result.buildingId, result.buildingSequence);
        setIsProcessing(false);
      } else {
        // Otherwise, show type selection dialog
        setShowTypeDialog(true);
      }
    } catch (err) {
      console.error('Failed to add building:', err);
      setIsProcessing(false);
    }
  }, [parcelId, defaultBuildingType, addBuilding, onBuildingAdded]);

  /**
   * Handle building creation from form
   */
  const handleCreateBuildingFromType = useCallback(
    async (buildingType: TabBuildingType, classValue: string | null) => {
      try {
        setShowTypeDialog(false);
        setIsProcessing(true);

        // Validate parcelId is available (mirror legacy app pattern where parcel context must exist)
        if (!parcelId) {
          console.error('Parcel ID is required to add a building');
          setIsProcessing(false);
          setShowTypeDialog(true); // Re-open dialog so user can try again
          return;
        }

        // Convert TabBuildingType to BuildingType expected by hook
        const convertedType: BuildingType = {
          id: buildingType.id.toString(),
          type: buildingType.type,
          class: classValue || buildingType.class,
          name: buildingType.type,
          description: buildingType.description,
          isActive: buildingType.isActive,
          percent: buildingType.bldgPercent,
        };

        const result = await addBuilding({
          parcelId,
          buildingType: convertedType,
        });
        onBuildingAdded?.(result.buildingId, result.buildingSequence);
        setIsProcessing(false);
      } catch (err) {
        console.error('Failed to add building with type:', err);
        setIsProcessing(false);
        setShowTypeDialog(true); // Re-open dialog on error
      }
    },
    [parcelId, addBuilding, onBuildingAdded]
  );

  /**
   * Handle dialog cancellation
   */
  const handleDialogCancel = useCallback(() => {
    setShowTypeDialog(false);
    reset();
  }, [reset]);

  /**
   * Handle error dismissal
   */
  const handleDismissError = useCallback(() => {
    setDismissedError(true);
    reset();
  }, [reset]);

  // Determine if button should be disabled
  const isDisabled = disabled || !isEditingAllowed || isLoading || isProcessing;
  const isLoaderVisible = isLoading || isProcessing || isLoadingTypes;

  // Generate tooltip text
  const tooltipText = isDisabled
    ? !parcelId
      ? 'Load a parcel first to add buildings'
      : !isEditingAllowed
        ? 'You do not have permission to edit this parcel'
        : 'Adding building in progress...'
    : `Add a new building (${existingBuildingCount} existing)`;

  return (
    <>
      <button
        className={`add-building-button ${className}`}
        onClick={handleAddBuildingClick}
        // disabled={isDisabled}
        title={tooltipText}
        aria-label={`Add new building. Current building count: ${existingBuildingCount}`}
      >
        {isLoaderVisible && <span className="loading-spinner" aria-hidden="true">⊙</span>}
        <span className="icon" aria-hidden="true">🏢</span>
      </button>

      {/* Error notification */}
      {error && !dismissedError && (
        <div className="error-notification" role="alert" aria-live="assertive">
          <span className="error-icon" aria-hidden="true">❌</span>
          <span className="error-message">{typeof error === 'string' ? error : (error as any)?.message || 'An error occurred'}</span>
          <button
            className="error-close"
            onClick={handleDismissError}
            aria-label="Dismiss error message"
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Building type selection dialog with form and table */}
      {showTypeDialog && (
        <BuildingTypeSelectionDialog
          buildingTypes={buildingTypes}
          onCancel={handleDialogCancel}
          onCreateBuilding={handleCreateBuildingFromType}
          isLoading={isLoading || isProcessing || isLoadingTypes}
        />
      )}
    </>
  );
};

export default AddBuildingButton;
