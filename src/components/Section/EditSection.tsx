import React, { useState } from 'react';

import { Button, FormField, Modal, Select, Textarea } from '@cloudscape-design/components';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';

import { IEvidence } from '@/types/HealthScribe';

interface NewSectionProps {
    isOpen: boolean;
    onClose: () => void;
    section: IEvidence;
    sectionIndex: number;
    sectionNames: string[];
}

const EditSection: React.FC<NewSectionProps> = ({ isOpen, onClose, section, sectionIndex, sectionNames }) => {
    const [selectedName, setSelectedName] = useState<OptionDefinition | null>({
        value: section.OriginalCategory,
        label: section.OriginalCategory,
    });
    const [note, setNote] = useState(section.SummarizedSegment);

    // const handleSave = async () => {
    //     const newSection: IAuraClinicalDocOutputSection = {
    //         SectionName: selectedName?.value || '',
    //         Summary: [
    //             {
    //                 EvidenceLinks: [],
    //                 SummarizedSegment: note,
    //                 OriginalCategory: selectedName?.value || '',
    //             },
    //         ],
    //     };
    //     handleAddSectionToClinicalDocument(newSection, currentSection);
    //     onClose();
    //     cleanFields();
    // };

    const handleCancel = () => {
        onClose();
        cleanFields();
    };

    const cleanFields = () => {
        setSelectedName(null);
        setNote('');
    };

    const sectionOptions = sectionNames.map((name) => ({
        label: name,
        value: name,
    }));

    return (
        <Modal
            visible={isOpen}
            onDismiss={handleCancel}
            header="Edit Note"
            footer={
                <div>
                    <Button variant="link" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={() => {}} disabled={!selectedName || !note.trim()}>
                        Save
                    </Button>
                </div>
            }
        >
            <FormField label="Area">
                <Select
                    selectedOption={selectedName}
                    onChange={({ detail }) => setSelectedName(detail.selectedOption)}
                    options={sectionOptions}
                />
            </FormField>
            <FormField label="Note">
                <Textarea value={note} onChange={({ detail }) => setNote(detail.value)} />
            </FormField>
        </Modal>
    );
};

export default EditSection;
