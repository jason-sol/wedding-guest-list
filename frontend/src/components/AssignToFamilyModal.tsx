import { useState, useEffect } from 'react';
import { Family, Guest } from '../types';
import { fetchFamilies, addGuestToFamily } from '../api';
import './AssignToFamilyModal.css';

interface AssignToFamilyModalProps {
  guest: Guest;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignToFamilyModal({
  guest,
  onClose,
  onSuccess,
}: AssignToFamilyModalProps) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      const data = await fetchFamilies();
      setFamilies(data);
    } catch (error) {
      console.error('Failed to load families:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFamilyId) {
      alert('Please select a family');
      return;
    }

    setIsSubmitting(true);
    try {
      await addGuestToFamily(selectedFamilyId, guest.id);
      onSuccess();
    } catch (error) {
      console.error('Failed to assign guest to family:', error);
      alert('Failed to assign guest to family');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign {guest.firstName} {guest.lastName} to Family</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="family">Select Family</label>
            <select
              id="family"
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
              required
            >
              <option value="">-- Select a family --</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign to Family'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
