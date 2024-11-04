// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Suspense, lazy, useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import ContentLayout from '@cloudscape-design/components/content-layout';
import Grid from '@cloudscape-design/components/grid';

import { MedicalScribeJob } from '@aws-sdk/client-transcribe';

import ModalLoader from '@/components/SuspenseLoader/ModalLoader';
import { useAudio } from '@/hooks/useAudio';
import { useNotificationsContext } from '@/store/notifications';
import { IAuraClinicalDocOutput, IAuraClinicalDocOutputSection, IAuraTranscriptOutput } from '@/types/HealthScribe';
import { getHealthScribeJob } from '@/utils/HealthScribeApi';
import { getObject, getS3Object, putObject } from '@/utils/S3Api';

import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import TopPanel from './TopPanel';

const ViewOutput = lazy(() => import('./ViewOutput'));

export enum SoapSections {
    Subjective = 'SUBJECTIVE',
    Objective = 'OBJECTIVE',
    Assessment = 'ASSESSMENT',
    Plan = 'PLAN',
}

export const SOAP_MAP: { [key: string]: string } = {
    CHIEF_COMPLAINT: SoapSections.Subjective,
    HISTORY_OF_PRESENT_ILLNESS: SoapSections.Objective,
    PAST_MEDICAL_HISTORY: SoapSections.Objective,
    PAST_FAMILY_HISTORY: SoapSections.Objective,
    PAST_SOCIAL_HISTORY: SoapSections.Objective,
    REVIEW_OF_SYSTEMS: SoapSections.Subjective,
    PHYSICAL_EXAMINATION: SoapSections.Subjective,
    DIAGNOSTIC_TESTING: SoapSections.Assessment,
    ASSESSMENT: SoapSections.Assessment,
    PLAN: SoapSections.Plan,
};

export default function Conversation() {
    const { conversationName } = useParams();
    const { addFlashMessage } = useNotificationsContext();

    const [jobLoading, setJobLoading] = useState(true); // Is getHealthScribeJob in progress
    const [jobDetails, setJobDetails] = useState<MedicalScribeJob | null>(null); // HealthScribe job details
    const [showOutputModal, setShowOutputModal] = useState<boolean>(false); // Is view results modal open

    const [clinicalDocument, setClinicalDocument] = useState<IAuraClinicalDocOutput | null>(null);
    const [transcriptFile, setTranscriptFile] = useState<IAuraTranscriptOutput | null>(null);

    const [
        wavesurfer,
        audioReady,
        setAudioReady,
        audioTime,
        setAudioTime,
        smallTalkCheck,
        setSmallTalkCheck,
        highlightId,
        setHighlightId,
    ] = useAudio();

    function convertToSOAPResults(result: IAuraClinicalDocOutput) {
        const soapResult: IAuraClinicalDocOutput = { ClinicalDocumentation: { Sections: [] } };
        const sections = result.ClinicalDocumentation.Sections || [];
        const sectionsMap: { [key: string]: IAuraClinicalDocOutputSection } = {};
        for (const section of sections) {
            const soapType = SOAP_MAP[section.SectionName];
            if (!sectionsMap[soapType]) {
                sectionsMap[soapType] = {
                    SectionName: soapType,
                    Summary: [],
                };
            }
            sectionsMap[soapType].Summary.push(
                ...section.Summary.map((summary) => ({ ...summary, OriginalCategory: section.SectionName }))
            );
        }

        soapResult.ClinicalDocumentation.Sections.push(sectionsMap[SoapSections.Subjective]);
        soapResult.ClinicalDocumentation.Sections.push(sectionsMap[SoapSections.Objective]);
        soapResult.ClinicalDocumentation.Sections.push(sectionsMap[SoapSections.Assessment]);
        soapResult.ClinicalDocumentation.Sections.push(sectionsMap[SoapSections.Plan]);

        return soapResult;
    }

    function isinSOAPFormat(clinicalDocumentResult: IAuraClinicalDocOutput) {
        const REQUIRED_SECTIONS = Object.values(SoapSections);
        const sectionNames = clinicalDocumentResult.ClinicalDocumentation.Sections.map(
            (section) => section.SectionName
        );
        return REQUIRED_SECTIONS.every((requiredSection) => sectionNames.includes(requiredSection));
    }

    async function getJob(conversationName: string) {
        try {
            setJobLoading(true);
            const getHealthScribeJobRsp = await getHealthScribeJob({ MedicalScribeJobName: conversationName });
            const medicalScribeJob = getHealthScribeJobRsp?.MedicalScribeJob;

            if (typeof medicalScribeJob === 'undefined') return;
            if (Object.keys(medicalScribeJob).length > 0) {
                setJobDetails(medicalScribeJob);
            }

            // Get Clinical Document from result S3 URL
            const clinicalDocumentUri = medicalScribeJob.MedicalScribeOutput?.ClinicalDocumentUri;
            const bucketInfo = getS3Object(clinicalDocumentUri || '');
            const clinicalDocumentRsp = await getObject(bucketInfo);
            const clinicalDocumentResult: IAuraClinicalDocOutput = JSON.parse(
                (await clinicalDocumentRsp?.Body?.transformToString()) || ''
            );
            let soapClinicalDocument: IAuraClinicalDocOutput = clinicalDocumentResult;
            if (!isinSOAPFormat(clinicalDocumentResult)) {
                soapClinicalDocument = convertToSOAPResults(clinicalDocumentResult);
            }

            setClinicalDocument(soapClinicalDocument);
            // Get Transcript File from result S3 URL
            const transcriptFileUri = medicalScribeJob.MedicalScribeOutput?.TranscriptFileUri;
            const transcriptFileRsp = await getObject(getS3Object(transcriptFileUri || ''));
            setTranscriptFile(JSON.parse((await transcriptFileRsp?.Body?.transformToString()) || ''));
        } catch (e) {
            setJobDetails(null);
            setJobLoading(false);
            addFlashMessage({
                id: e?.toString() || 'GetHealthScribeJob error',
                header: 'Conversation Error',
                content: e?.toString() || 'GetHealthScribeJob error',
                type: 'error',
            });
        }
        setJobLoading(false);
    }

    useEffect(() => {
        if (!conversationName) {
            return;
        } else {
            getJob(conversationName).catch(console.error);
        }
    }, []);

    const clinicalDocumentUri = jobDetails?.MedicalScribeOutput?.ClinicalDocumentUri;

    const saveClinicalDocument = async (updatedDocument: IAuraClinicalDocOutput) => {
        const bucketInfo = getS3Object(clinicalDocumentUri || '');
        const putObjectProps = {
            Bucket: bucketInfo.Bucket,
            Key: bucketInfo.Key,
            Body: JSON.stringify(updatedDocument),
            ContentType: 'application/json',
        };

        await putObject(putObjectProps);
    };

    const addSectionToClinicalDocument = (
        section: IAuraClinicalDocOutputSection | null,
        document: IAuraClinicalDocOutput | null,
        currentSection: string
    ) => {
        if (!document || !section) return document;

        const soapType = SOAP_MAP[section.SectionName];
        if (!soapType) return document;

        const sections = document.ClinicalDocumentation.Sections || [];
        let soapSection = sections.find((sec) => sec.SectionName === currentSection);
        if (!soapSection) {
            soapSection = {
                SectionName: soapType,
                Summary: [],
            };
            sections.push(soapSection);
        }
        soapSection.Summary.push(
            ...section.Summary.map((summary) => ({ ...summary, OriginalCategory: section.SectionName }))
        );

        return document;
    };

    const deleteSectionFromClinicalDocument = (
        section: IAuraClinicalDocOutputSection | null,
        document: IAuraClinicalDocOutput | null,
        sectionIndex: number,
    ) => {
        if (!document || !section) return document;

        document.ClinicalDocumentation.Sections.find(
            (current) => current.SectionName === section.SectionName
        )?.Summary.splice(Number(sectionIndex), 1);

        return document;
    }

    const updateSectionToClinicalDocument = async (
        section: IAuraClinicalDocOutputSection,
        updateFunction: (
            section: IAuraClinicalDocOutputSection | null,
            document: IAuraClinicalDocOutput | null
        ) => IAuraClinicalDocOutput | null
    ) => {
        setClinicalDocument((prevClinicalDocument) => {
            if (!prevClinicalDocument || !section) return prevClinicalDocument;
            const updatedDocument = updateFunction(section, prevClinicalDocument);
            if (updatedDocument) {
                saveClinicalDocument(updatedDocument);
            }

            return updatedDocument;
        });
    };

    return (
        <ContentLayout headerVariant={'high-contrast'}>
            {showOutputModal && (
                <Suspense fallback={<ModalLoader />}>
                    <ViewOutput
                        setVisible={setShowOutputModal}
                        transcriptString={JSON.stringify(transcriptFile || 'Loading...', null, 2)}
                        clinicalDocumentString={JSON.stringify(clinicalDocument || 'Loading...', null, 2)}
                    />
                </Suspense>
            )}
            <Grid
                gridDefinition={[
                    { colspan: { default: 12 } },
                    { colspan: { default: 6 } },
                    { colspan: { default: 6 } },
                ]}
            >
                <TopPanel
                    jobLoading={jobLoading}
                    jobDetails={jobDetails}
                    transcriptFile={transcriptFile}
                    wavesurfer={wavesurfer}
                    smallTalkCheck={smallTalkCheck}
                    setSmallTalkCheck={setSmallTalkCheck}
                    setAudioTime={setAudioTime}
                    setAudioReady={setAudioReady}
                />
                <LeftPanel
                    jobLoading={jobLoading}
                    transcriptFile={transcriptFile}
                    highlightId={highlightId}
                    setHighlightId={setHighlightId}
                    wavesurfer={wavesurfer}
                    smallTalkCheck={smallTalkCheck}
                    audioTime={audioTime}
                    setAudioTime={setAudioTime}
                    audioReady={audioReady}
                />
                <RightPanel
                    jobLoading={jobLoading}
                    clinicalDocument={clinicalDocument}
                    transcriptFile={transcriptFile}
                    highlightId={highlightId}
                    setHighlightId={setHighlightId}
                    wavesurfer={wavesurfer}
                    handleAddSectionToClinicalDocument={(section, currentSection) =>
                        updateSectionToClinicalDocument(section, (section, document) =>
                            addSectionToClinicalDocument(section, document, currentSection)
                        )
                    }
                    handleDeleteSelectedSection={(section, sectionIndex) =>
                        updateSectionToClinicalDocument(section, (section, document) =>
                            deleteSectionFromClinicalDocument(section, document, sectionIndex)
                        )
                    }
                />
            </Grid>
        </ContentLayout>
    );
}
