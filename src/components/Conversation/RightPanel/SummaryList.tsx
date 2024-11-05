import React, { useEffect, useState } from 'react';

import * as awsui from '@cloudscape-design/design-tokens';
import { Button, Icon, Modal, SpaceBetween } from '@cloudscape-design/components';
import Box from '@cloudscape-design/components/box';

import EditSection from '@/components/Section/EditSection';
import { SegmentExtractedData } from '@/types/ComprehendMedical';
import { IAuraClinicalDocOutputSection, IEvidence } from '@/types/HealthScribe';

import styles from './SummarizedConcepts.module.css';
import { ExtractedHealthDataWord } from './SummaryListComponents';
import { processSummarizedSegment } from './summarizedConceptsUtils';

function NoEntities() {
    return (
        <div style={{ paddingLeft: '5px' }}>
            <Box variant="small">No Clinical Entities</Box>
        </div>
    );
}

type SummaryListDefaultProps = {
    sectionNames: string[];
    sectionName: string;
    summary: IEvidence[];
    summaryExtractedHealthData?: SegmentExtractedData[];
    acceptableConfidence: number;
    currentSegment: string;
    handleSegmentClick: (SummarizedSegment: string, EvidenceLinks: { SegmentId: string }[]) => void;
    handleDeleteSelectedSection: (sectionName: IAuraClinicalDocOutputSection, sectionIndex: number) => void;
    handleEditSelectedSection: (
        sectionName: IAuraClinicalDocOutputSection,
        sectionIndex: number,
        name: string | undefined,
        note: string
    ) => void;
};

export function SummaryListDefault({
    sectionNames,
    sectionName,
    summary,
    summaryExtractedHealthData,
    acceptableConfidence,
    currentSegment = '',
    handleSegmentClick,
    handleDeleteSelectedSection,
    handleEditSelectedSection,
}: SummaryListDefaultProps) {
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [sectionToDelete, setSectionToDelete] = React.useState<IEvidence | null>(null);
    const [sectionIndexToDelete, setSectionIndexToDelete] = React.useState<number | null>(null);
    const [sectionToEdit, setSectionToEdit] = React.useState<IEvidence | null>(null);
    const [sectionIndexToEdit, setSectionIndexToEdit] = React.useState<number | null>(null);
    const [currentSummary, setCurrentSummary] = React.useState<IAuraClinicalDocOutputSection>({
        SectionName: '',
        Summary: [],
    });

    useEffect(() => {
        // Empty useEffect to trigger updates
    }, [sectionToEdit]);

    useEffect(() => {
        // Empty useEffect to trigger updates
    }, [currentSummary]);

    const handleDeleteSection = () => {
        if (sectionToDelete && sectionIndexToDelete !== null) {
            handleDeleteSelectedSection(currentSummary, sectionIndexToDelete);
        }

        setShowDeleteModal(false);
    };

    if (summary.length) {
        return (
            <table className={styles.summaryTable}>
                <Modal
                    visible={showDeleteModal}
                    onDismiss={() => setShowDeleteModal(false)}
                    header="Please confirm that you want to delete the section"
                    footer={
                        <Box float="right">
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button variant="link" onClick={handleDeleteSection}>
                                    Delete
                                </Button>
                                <Button variant="link" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </Button>
                            </SpaceBetween>
                        </Box>
                    }
                ></Modal>
                {sectionToEdit && sectionIndexToEdit !== null && (
                    <EditSection 
                        isOpen={showEditModal} 
                        onClose={() => setShowEditModal(false)} 
                        section={currentSummary} 
                        sectionIndex={sectionIndexToEdit}
                        sectionNames={sectionNames}
                        handleEditSelectedSection={handleEditSelectedSection}
                    />
                )}
                <thead>
                    <tr>
                        <th>Area</th>
                        <th>Note</th>
                        <th></th>
                    </tr>
                </thead>
                {summary.map((section, sectionIndex) => {
                    const { OriginalCategory, EvidenceLinks } = section;
                    let SummarizedSegment = section.SummarizedSegment;

                    if (SummarizedSegment === '') return false;

                    // Check if the segment is a section header
                    let sectionHeader = '';
                    let indent = false;
                    if (SummarizedSegment.endsWith('\n')) {
                        const splitSegement = SummarizedSegment.split('\n');
                        if (SummarizedSegment.split('\n').length === 3) {
                            sectionHeader = splitSegement[0];
                            SummarizedSegment = SummarizedSegment.substring(SummarizedSegment.indexOf('\n') + 1);
                        }
                        indent = true;
                    }
                    const sectionHeaderWordLength = sectionHeader ? sectionHeader.split(' ').length : 0;

                    const summaryItemDivStyle = {
                        color: awsui.colorTextBodyDefault,
                        backgroundColor:
                            currentSegment === SummarizedSegment ? awsui.colorBackgroundToggleCheckedDisabled : '',
                    };

                    if (summaryExtractedHealthData) {
                        const sectionExtractedData = summaryExtractedHealthData[sectionIndex];
                        return (
                            <>
                                {sectionHeaderWordLength > 0 && (
                                    <tr>
                                        <td colSpan={3}>
                                            <div>
                                                {sectionExtractedData.words
                                                    .slice(0, sectionHeaderWordLength)
                                                    .map(({ word, linkedId }, wordIndex) => (
                                                        <ExtractedHealthDataWord
                                                            key={`${sectionName}_${sectionIndex}_${wordIndex}`}
                                                            linkedId={linkedId}
                                                            sectionExtractedData={sectionExtractedData}
                                                            word={word}
                                                            acceptableConfidence={acceptableConfidence}
                                                        />
                                                    ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                <tr className={`${styles.summaryListItem} ${indent && styles.summaryListItemIndent}`}>
                                    <td>{OriginalCategory}</td>
                                    <td>
                                        <div
                                            onClick={() => handleSegmentClick(SummarizedSegment, EvidenceLinks)}
                                            className={styles.summarizedSegment}
                                            style={summaryItemDivStyle}
                                        >
                                            {sectionExtractedData.words
                                                .slice(sectionHeaderWordLength)
                                                .map(({ word, linkedId }, wordIndex) => {
                                                    if (word === '-' && wordIndex <= 1) return false;

                                                    return (
                                                        <ExtractedHealthDataWord
                                                            key={`${sectionName}_${sectionIndex}_${wordIndex}`}
                                                            linkedId={linkedId}
                                                            sectionExtractedData={sectionExtractedData}
                                                            word={word}
                                                            acceptableConfidence={acceptableConfidence}
                                                        />
                                                    );
                                                })}
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <Icon name="edit" size="medium" />
                                        </div>
                                        <div
                                            className={styles.deleteSection}
                                            onClick={() => {
                                                setSectionToDelete(section);
                                                setSectionIndexToDelete(sectionIndex);
                                                setCurrentSummary({ SectionName: sectionName, Summary: summary });
                                                setShowDeleteModal(true);
                                            }}
                                        >
                                            <Icon name="remove" size="medium" variant='error' />
                                        </div>
                                    </td>
                                </tr>
                            </>
                        );
                    } else {
                        return (
                            <>
                                {sectionHeader && (
                                    <tr>
                                        <td colSpan={3} className={styles.summaryListItemSubHeader}>
                                            {sectionHeader}
                                        </td>
                                    </tr>
                                )}
                                <tr className={`${styles.summaryListItem} ${indent && styles.summaryListItemIndent}`}>
                                    <td>{OriginalCategory}</td>
                                    <td width="100%">
                                        <div
                                            onClick={() => handleSegmentClick(SummarizedSegment, EvidenceLinks)}
                                            className={styles.summarizedSegment}
                                            style={summaryItemDivStyle}
                                        >
                                            {processSummarizedSegment(SummarizedSegment)}
                                        </div>
                                    </td>
                                    <td>
                                        <div
                                            onClick={() => {
                                                setSectionToEdit(section);
                                                setSectionIndexToEdit(sectionIndex);
                                                setCurrentSummary({ SectionName: sectionName, Summary: summary });
                                                setShowEditModal(true);
                                            }}
                                        >
                                            <Icon name="edit" size="medium" />
                                        </div>
                                        <div
                                            className={styles.deleteSection}
                                            onClick={() => {
                                                setSectionToDelete(section);
                                                setSectionIndexToDelete(sectionIndex);
                                                setCurrentSummary({ SectionName: sectionName, Summary: summary });
                                                setShowDeleteModal(true);
                                            }}
                                        >
                                            <Icon name="remove" size="medium" variant="error" />
                                        </div>
                                    </td>
                                </tr>
                            </>
                        );
                    }
                })}
            </table>
        );
    } else {
        return <NoEntities />;
    }
}
