// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { useEffect, useMemo, useState } from 'react';

import Button from '@cloudscape-design/components/button';
import TextContent from '@cloudscape-design/components/text-content';

import toast from 'react-hot-toast';
import WaveSurfer from 'wavesurfer.js';

import NewSection from '@/components/Section/NewSection';
import { ExtractedHealthData, SummarySectionEntityMapping } from '@/types/ComprehendMedical';
import { IAuraClinicalDocOutputSection, ITranscriptSegments } from '@/types/HealthScribe';
import toTitleCase from '@/utils/toTitleCase';

import { SOAP_MAP, SoapSections } from '../Conversation';
import { HighlightId } from '../types';
import { SummaryListDefault } from './SummaryList';
import { SECTION_ORDER } from './sectionOrder';
import { mergeHealthScribeOutputWithComprehendMedicalOutput } from './summarizedConceptsUtils';

type SummarizedConceptsProps = {
    sections: IAuraClinicalDocOutputSection[];
    extractedHealthData: ExtractedHealthData[];
    acceptableConfidence: number;
    highlightId: HighlightId;
    setHighlightId: React.Dispatch<React.SetStateAction<HighlightId>>;
    segmentById: {
        [key: string]: ITranscriptSegments;
    };
    wavesurfer: React.MutableRefObject<WaveSurfer | undefined>;
    handleAddSectionToClinicalDocument: (sectionName: IAuraClinicalDocOutputSection, currentSection: string) => void;
    handleDeleteSelectedSection: (sectionName: IAuraClinicalDocOutputSection, sectionIndex: number) => void;
    handleEditSelectedSection: (
        sectionName: IAuraClinicalDocOutputSection,
        sectionIndex: number,
        name: string | undefined,
        note: string
    ) => void;
};

export default function SummarizedConcepts({
    sections,
    extractedHealthData,
    acceptableConfidence,
    highlightId,
    setHighlightId,
    segmentById,
    wavesurfer,
    handleAddSectionToClinicalDocument,
    handleDeleteSelectedSection,
    handleEditSelectedSection,
}: SummarizedConceptsProps) {
    const [currentId, setCurrentId] = useState(0);
    const [currentSegment, setCurrentSegment] = useState<string>('');
    const [currentSection, setCurrentSection] = useState<string>('');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const toggleDialog = (sectionName: string) => {
        setIsDialogOpen(!isDialogOpen);
        setCurrentSection(sectionName);
    };

    // Unset current segment when the highlight is removed, i.e. the current audio time is outside the summarization
    useEffect(() => {
        if (!highlightId.selectedSegmentId) setCurrentSegment('');
    }, [highlightId]);

    const sectionsWithExtractedData: SummarySectionEntityMapping[] = useMemo(
        () => mergeHealthScribeOutputWithComprehendMedicalOutput(sections, extractedHealthData),
        [sections, extractedHealthData]
    );

    /**
     * Handles the click event on a summarized segment in the UI.
     *
     * @param SummarizedSegment - The text of the summarized segment that was clicked.
     * @param EvidenceLinks - An array of objects containing the SegmentId for each evidence link associated with the summarized segment.
     * @returns void
     */
    function handleSegmentClick(SummarizedSegment: string, EvidenceLinks: { SegmentId: string }[]) {
        let currentIdLocal = currentId;
        if (currentSegment !== SummarizedSegment) {
            setCurrentSegment(SummarizedSegment);
            setCurrentId(0);
            currentIdLocal = 0;
        }
        const id = EvidenceLinks[currentIdLocal].SegmentId;
        // Set state back to Conversation, used to highlight the transcript in LeftPanel
        const newHighlightId = {
            allSegmentIds: EvidenceLinks.map((i) => i.SegmentId),
            selectedSegmentId: id,
        };
        setHighlightId(newHighlightId);

        const current = wavesurfer.current?.getDuration();
        const toastId = currentIdLocal + 1;
        if (current) {
            const seekId = segmentById[id].BeginAudioTime / current;
            wavesurfer.current?.seekTo(seekId);
            if (currentIdLocal < EvidenceLinks.length - 1) {
                setCurrentId(currentIdLocal + 1);
            } else {
                setCurrentId(0);
            }

            toast.success(`Jump Successful. Sentence ${toastId} of ${EvidenceLinks.length}`);
        } else if (!current) {
            if (currentIdLocal < EvidenceLinks.length - 1) {
                setCurrentId(currentIdLocal + 1);
            } else {
                setCurrentId(0);
            }
            toast.success(`Jump Successful. Sentence ${toastId} of ${EvidenceLinks.length}. Audio not yet ready`);
        } else {
            toast.error('Unable to jump to that Clinical Attribute');
        }
    }

    const sortedSections = useMemo(() => {
        return sections.sort(
            (a, b) => SECTION_ORDER.indexOf(a.SectionName) - SECTION_ORDER.indexOf(b.SectionName) || 1
        );
    }, [sections]);

    const sectionNames = Object.keys(SOAP_MAP).filter(
        (section) => section !== SoapSections.Subjective && section !== SoapSections.Objective
    );

    return (
        <>
            {sortedSections.map(({ SectionName, Summary }, i) => {
                // Match this section name to the Comprehend Medical extracted data. Returns undefined if the section doesn't exist
                const sectionExtractedHealthData = sectionsWithExtractedData.find((s) => s.SectionName === SectionName);
                return (
                    <div key={`insightsSection_${i}`}>
                        <TextContent>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3 style={{ marginTop: '10px' }}>{toTitleCase(SectionName.replace(/_/g, ' '))}</h3>
                                <Button iconName="add-plus" variant="icon" onClick={() => toggleDialog(SectionName)} />
                            </div>
                        </TextContent>
                        <SummaryListDefault
                            sectionNames={sectionNames}
                            sectionName={SectionName}
                            summary={Summary}
                            summaryExtractedHealthData={sectionExtractedHealthData?.Summary}
                            acceptableConfidence={acceptableConfidence}
                            currentSegment={currentSegment}
                            handleSegmentClick={handleSegmentClick}
                            handleDeleteSelectedSection={handleDeleteSelectedSection}
                            handleEditSelectedSection={handleEditSelectedSection}
                        />
                    </div>
                );
            })}
            <NewSection
                isOpen={isDialogOpen}
                onClose={() => toggleDialog(currentSection)}
                currentSection={currentSection}
                sectionNames={sectionNames}
                handleAddSectionToClinicalDocument={handleAddSectionToClinicalDocument}
            />
        </>
    );
}
