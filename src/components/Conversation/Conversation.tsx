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
import { getObject, getS3Object } from '@/utils/S3Api';

import { ConversationHeader } from './ConversationHeader';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import TopPanel from './TopPanel';

const ViewOutput = lazy(() => import('./ViewOutput'));

export default function Conversation() {
    const { conversationName } = useParams();
    const { addFlashMessage } = useNotificationsContext();

    const [jobLoading, setJobLoading] = useState(true); // Is getHealthScribeJob in progress
    const [jobDetails, setJobDetails] = useState<MedicalScribeJob | null>(null); // HealthScribe job details
    const [showOutputModal, setShowOutputModal] = useState<boolean>(false); // Is view results modal open

    const [clinicalDocument, setClinicalDocument] = useState<IAuraClinicalDocOutput | null>(null);
    const [transcriptFile, setTranscriptFile] = useState<IAuraTranscriptOutput | null>(null);
    
    enum SoapSections {
        Subjective = 'SUBJECTIVE',
        Objective = 'OBJECTIVE',
        Assessment = 'ASSESSMENT',
        Plan = 'PLAN'
    };

    const SOAP_MAP:{ [key: string]: string } = {
        CHIEF_COMPLAINT: SoapSections.Plan,
        HISTORY_OF_PRESENT_ILLNESS: SoapSections.Objective,
        PAST_MEDICAL_HISTORY: SoapSections.Objective,
        PAST_FAMILY_HISTORY: SoapSections.Objective,
        PAST_SOCIAL_HISTORY: SoapSections.Objective,
        REVIEW_OF_SYSTEMS: SoapSections.Objective,
        PHYSICAL_EXAMINATION: SoapSections.Subjective,
        DIAGNOSTIC_TESTING: SoapSections.Assessment,
        ASSESSMENT: SoapSections.Assessment,
        PLAN: SoapSections.Plan
    };

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

    useEffect(() => {
        function convertToSOAPResults(result: IAuraClinicalDocOutput) {
            const soapResult: IAuraClinicalDocOutput = {ClinicalDocumentation: {Sections: []}} 
            const sections = result.ClinicalDocumentation.Sections || [];
            const sectionsMap:{ [key: string]: IAuraClinicalDocOutputSection } = {};
            for (const section of sections) {
                const soapType = SOAP_MAP[section.SectionName];
                if (!sectionsMap[soapType]) {
                    sectionsMap[soapType] = {
                        SectionName: soapType,
                        Summary: []
                    }
                }
                sectionsMap[soapType].Summary.push(...section.Summary);
            }

            soapResult.ClinicalDocumentation.Sections.push(sectionsMap[SoapSections.Subjective]);
            soapResult.ClinicalDocumentation.Sections.push(sectionsMap[SoapSections.Objective]);
            soapResult.ClinicalDocumentation.Sections.push(sectionsMap[SoapSections.Assessment]);
            soapResult.ClinicalDocumentation.Sections.push(sectionsMap[SoapSections.Plan]);

            return soapResult;
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
                const clinicalDocumentResult = JSON.parse((await clinicalDocumentRsp?.Body?.transformToString()) || '');
                const soapClinicalDocument = convertToSOAPResults(clinicalDocumentResult);
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
        if (!conversationName) {
            return;
        } else {
            getJob(conversationName).catch(console.error);
        }
    }, []);

    return (
        <ContentLayout
            headerVariant={'high-contrast'}
            header={<ConversationHeader jobDetails={jobDetails} setShowOutputModal={setShowOutputModal} />}
        >
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
                />
            </Grid>
        </ContentLayout>
    );
}
