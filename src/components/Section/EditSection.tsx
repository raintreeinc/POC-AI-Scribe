import React, { useEffect, useState } from 'react';

import { Button, FormField, Modal, Select, Textarea } from '@cloudscape-design/components';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';

import { IAuraClinicalDocOutputSection } from '@/types/HealthScribe';

interface NewSectionProps {
    isOpen: boolean;
    onClose: () => void;
    section: IAuraClinicalDocOutputSection;
    sectionIndex: number;
    sectionNames: string[];
    handleEditSelectedSection: (
        sectionName: IAuraClinicalDocOutputSection,
        sectionIndex: number,
        name: string | undefined,
        note: string
    ) => void;
}

const EditSection: React.FC<NewSectionProps> = ({
    isOpen,
    onClose,
    section,
    sectionIndex,
    sectionNames,
    handleEditSelectedSection,
}) => {
    const [selectedName, setSelectedName] = useState<OptionDefinition | null>({
        value: section.Summary[sectionIndex].OriginalCategory,
        label: section.Summary[sectionIndex].OriginalCategory,
    });
    const [note, setNote] = useState(section.Summary[sectionIndex].SummarizedSegment);

    useEffect(() => {
        setSelectedName({
            value: section.Summary[sectionIndex].OriginalCategory,
            label: section.Summary[sectionIndex].OriginalCategory,
        });
        setNote(section.Summary[sectionIndex].SummarizedSegment);
    }, [section]);

    const handleSave = () => {
        handleEditSelectedSection(section, sectionIndex, selectedName?.value, note);
        onClose();
        cleanFields();
    };

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
                    <Button variant="primary" onClick={handleSave} disabled={!selectedName || !note.trim()}>
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
