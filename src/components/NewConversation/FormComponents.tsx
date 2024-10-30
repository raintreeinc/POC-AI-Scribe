// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from 'react';

import Box from '@cloudscape-design/components/box';
import DatePicker from '@cloudscape-design/components/date-picker';
import FormField from '@cloudscape-design/components/form-field';
import Grid from '@cloudscape-design/components/grid';
import Input from '@cloudscape-design/components/input';
import RadioGroup from '@cloudscape-design/components/radio-group';
import Select from '@cloudscape-design/components/select';
import TextContent from '@cloudscape-design/components/text-content';

import styles from './NewConversation.module.css';
import { AudioDetails, AudioSelection } from './types';

type InputFirstNameProps = {
    firstName: string;
    setFirstName: React.Dispatch<React.SetStateAction<string>>;
};
export function InputFirstName({ firstName, setFirstName }: InputFirstNameProps) {
    return (
        <FormField label="First Name">
            <Input onChange={({ detail }) => setFirstName(detail.value)} placeholder="First Name" value={firstName} />
        </FormField>
    );
}

type InputLastNameProps = {
    lastName: string;
    setLastName: React.Dispatch<React.SetStateAction<string>>;
};
export function InputLastName({ lastName, setLastName }: InputLastNameProps) {
    return (
        <FormField label="Last Name">
            <Input onChange={({ detail }) => setLastName(detail.value)} placeholder="Last Name" value={lastName} />
        </FormField>
    );
}
type InputDurationProps = {
    duration: string;
    setDuration: React.Dispatch<React.SetStateAction<string>>;
};
export function InputDuration({ duration, setDuration }: InputDurationProps) {
    return (
        <FormField label="Duration">
            <Select
                selectedOption={{ label: '', value: duration.toString() }}
                onChange={({ detail }) => setDuration(detail.selectedOption.value ?? '')}
                options={[
                    { label: '30 Minutes', value: '30 Minutes' },
                    { label: '60 Minutes', value: '60 Minutes' },
                    { label: '90 Minutes', value: '90 Minutes' },
                ]}
            />
        </FormField>
    );
}

type InputDateProps = {
    date: string;
    setDate: React.Dispatch<React.SetStateAction<string>>;
};
export function InputDate({ date, setDate }: InputDateProps) {
    return (
        <FormField label="Date" constraintText="Use YYYY/MM/DD format.">
            <DatePicker
                onChange={({ detail }) => setDate(detail.value)}
                value={date}
                openCalendarAriaLabel={(selectedDate) =>
                    'Choose certificate expiry date' + (selectedDate ? `, selected date is ${selectedDate}` : '')
                }
                placeholder="YYYY/MM/DD"
            />
        </FormField>
    );
}

type AudioIdentificationTypeProps = {
    audioSelection: AudioSelection;
    setAudioSelection: React.Dispatch<React.SetStateAction<AudioSelection>>;
};
export function AudioIdentificationType({ audioSelection, setAudioSelection }: AudioIdentificationTypeProps) {
    return (
        <FormField
            label="Audio identification type"
            description="Choose to split multi-channel audio into separate channels for transcription, or partition speakers in the input audio."
        >
            <div>
                <RadioGroup
                    onChange={({ detail }) => setAudioSelection(detail.value)}
                    value={audioSelection}
                    items={[
                        {
                            value: 'speakerPartitioning',
                            label: 'Speaker partitioning',
                            description:
                                'Use this option if you want to identify multiple speakers in one audio channel.',
                        },
                        {
                            value: 'channelIdentification',
                            label: 'Channel identification',
                            description:
                                'Use this option if you want to identify speakers from audio containing two channels.',
                        },
                    ]}
                />
            </div>
        </FormField>
    );
}

type AudioDetailSettingsProps = {
    audioSelection: AudioSelection;
    audioDetails: AudioDetails;
    setAudioDetails: React.Dispatch<React.SetStateAction<AudioDetails>>;
};
export function AudioDetailSettings({ audioSelection, audioDetails, setAudioDetails }: AudioDetailSettingsProps) {
    if (audioSelection === 'speakerPartitioning') {
        return (
            <FormField
                description="Providing the number of speakers can increase the accuracy of your results."
                label={<TextContent>Maximum number of speakers</TextContent>}
                constraintText="The maximum number of speakers is 10."
                errorText={
                    (audioDetails.speakerPartitioning.maxSpeakers < 2 ||
                        audioDetails.speakerPartitioning.maxSpeakers > 10) &&
                    'Invalid number of speakers.'
                }
            >
                <div className={styles.numberOfSpeakersInput}>
                    <Input
                        onChange={({ detail }) =>
                            setAudioDetails((prevDetails) => {
                                return {
                                    ...prevDetails,
                                    speakerPartitioning: {
                                        maxSpeakers: parseInt(detail.value),
                                    },
                                };
                            })
                        }
                        value={audioDetails.speakerPartitioning.maxSpeakers.toString()}
                        inputMode="numeric"
                        type="number"
                    />
                </div>
            </FormField>
        );
    } else if (audioSelection === 'channelIdentification') {
        return (
            <FormField
                description="Select which persona is on a two channel audio file."
                label={<TextContent>Map channels</TextContent>}
            >
                <Grid gridDefinition={[{ colspan: 3 }, { colspan: 3 }]}>
                    <TextContent>
                        <p>
                            <strong>Channel 1</strong>
                        </p>
                        <RadioGroup
                            onChange={({ detail }) =>
                                setAudioDetails((prevDetails) => {
                                    return {
                                        ...prevDetails,
                                        channelIdentification: {
                                            channel1: detail.value,
                                        },
                                    };
                                })
                            }
                            value={audioDetails.channelIdentification.channel1}
                            items={[
                                {
                                    value: 'CLINICIAN',
                                    label: 'Clinician',
                                },
                                {
                                    value: 'PATIENT',
                                    label: 'Patient',
                                },
                            ]}
                        />
                    </TextContent>
                    <TextContent>
                        <Box textAlign="center">
                            <p>
                                <strong>Channel 2</strong>
                            </p>
                            <p>
                                {audioDetails.channelIdentification.channel1 === 'CLINICIAN' ? 'Patient' : 'Clinician'}
                            </p>
                        </Box>
                    </TextContent>
                </Grid>
            </FormField>
        );
    } else {
        return null;
    }
}
