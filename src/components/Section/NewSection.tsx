import React, { useState } from 'react';

import { Button, FormField, Modal, Select, Textarea } from '@cloudscape-design/components';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';

import { IAuraClinicalDocOutputSection } from '@/types/HealthScribe';

interface NewSectionProps {
    isOpen: boolean;
    onClose: () => void;
    sectionNames: string[];
    handleAddSectionToClinicalDocument: (sectionName: IAuraClinicalDocOutputSection, currentSection: string) => void;
    currentSection: string;
}

const NewSection: React.FC<NewSectionProps> = ({
    isOpen,
    onClose,
    sectionNames,
    handleAddSectionToClinicalDocument,
    currentSection,
}) => {
    const [selectedName, setSelectedName] = useState<OptionDefinition | null>(null);
    const [note, setNote] = useState('');

    const handleSave = async () => {
        const newSection: IAuraClinicalDocOutputSection = {
            SectionName: selectedName?.value || '',
            Summary: [
                {
                    EvidenceLinks: [],
                    SummarizedSegment: note,
                    OriginalCategory: selectedName?.value || '',
                },
            ],
        };
        handleAddSectionToClinicalDocument(newSection, currentSection);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    const sectionOptions = sectionNames.map((name) => ({
        label: name,
        value: name,
    }));

    return (
        <Modal
            visible={isOpen}
            onDismiss={handleCancel}
            header="Add New Section"
            footer={
                <div>
                    <Button variant="link" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={!selectedName || !note}>
                        Save
                    </Button>
                </div>
            }
        >
            <FormField label="Name">
                <Select
                    selectedOption={selectedName || null}
                    onChange={({ detail }) => setSelectedName(detail.selectedOption)}
                    options={sectionOptions}
                    placeholder="Select a name"
                />
            </FormField>
            <FormField label="Note">
                <Textarea
                    value={note}
                    onChange={({ detail }) => setNote(detail.value)}
                    placeholder="Enter your note here"
                />
            </FormField>
        </Modal>
    );
};

export default NewSection;
