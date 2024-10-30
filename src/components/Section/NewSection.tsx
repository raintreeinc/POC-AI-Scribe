import React, { useState } from 'react';

import { Button, FormField, Modal, Select, Textarea } from '@cloudscape-design/components';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';

import { IAuraClinicalDocOutput, IAuraClinicalDocOutputSection } from '@/types/HealthScribe';
import { getS3Object, putObject } from '@/utils/S3Api';

interface NewSectionProps {
    isOpen: boolean;
    onClose: () => void;
    sectionNames: string[];
    clinicalDocumentUri: string;
    setClinicalDocument: React.Dispatch<React.SetStateAction<IAuraClinicalDocOutput | null>>;
    handleAddSectionToClinicalDocument: (sectionName: IAuraClinicalDocOutputSection) => void;
}

const NewSection: React.FC<NewSectionProps> = ({
    isOpen,
    onClose,
    sectionNames,
    clinicalDocumentUri,
    handleAddSectionToClinicalDocument,
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
        handleAddSectionToClinicalDocument(newSection);
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
        <>
            {/* <form onSubmit={(e) => submitSection(e)}>
                <Form
                    errorText={formError}
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            {isSubmitting ? (
                                <Button formAction="submit" variant="primary" disabled={true}>
                                    <Spinner />
                                </Button>
                            ) : (
                                <Button formAction="submit" variant="primary" disabled={!selectedName || !note}>
                                    Submit
                                </Button>
                            )}
                        </SpaceBetween>
                    }
                > */}
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
            {/* </Form>
            </form> */}
        </>
    );
};

export default NewSection;
