import type { Dispatch, SetStateAction } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";
import type { RunnerFormData } from "../../lib/types";
import {
  RACE_OPTIONS,
  DAYS_OF_WEEK,
  ProgressBar,
  FieldLabel,
  NumBox,
  Chip,
  SectionTitle,
} from "./OnboardingCommon";

type SetField = <K extends keyof RunnerFormData>(key: K, value: RunnerFormData[K]) => void;

export function Step1({
  form,
  setField,
  step1Errors,
  calendarOpen,
  setCalendarOpen,
  minDate,
  maxDate,
  pbLabel,
}: {
  form: RunnerFormData;
  setField: SetField;
  step1Errors: { raceDate?: string; raceType?: string; goalTime?: string };
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  minDate: Date;
  maxDate: Date;
  pbLabel: string;
}) {
  return (
    <div className="px-6 pb-4 flex flex-col gap-5" style={{ paddingTop: 16 }}>
      <div>
        <FieldLabel label="대회 일시" />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            className="border border-[rgba(60,60,67,0.29)] rounded-[18px] flex items-center justify-between cursor-pointer"
            style={{ width: 272, height: 52, paddingLeft: 16, paddingRight: 16 }}
          >
            <span
              className="font-medium"
              style={{
                fontSize: 16,
                color: form.raceDate ? "#000000" : "rgba(60,60,67,0.29)",
              }}
            >
              {form.raceDate
                ? (() => {
                    const d = new Date(form.raceDate);
                    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                  })()
                : "날짜 선택"}
            </span>
            <CalendarDays className="size-[18px] text-black" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={form.raceDate ? new Date(form.raceDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  setField("raceDate", `${y}-${m}-${d}`);
                }
                setCalendarOpen(false);
              }}
              disabled={(date) => date < minDate || date > maxDate}
            />
          </PopoverContent>
        </Popover>
        {step1Errors.raceDate && (
          <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step1Errors.raceDate}</p>
        )}
      </div>

      <div>
        <FieldLabel label="참가 코스" />
        <div className="flex gap-2">
          {RACE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={form.raceType === opt.value}
              onClick={() => setField("raceType", opt.value)}
              flex
              size="s"
            />
          ))}
        </div>
        {step1Errors.raceType && (
          <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step1Errors.raceType}</p>
        )}
      </div>

      <div>
        <FieldLabel label="목표 기록" />
        <div className="flex items-center gap-[6px]">
          <NumBox value={form.goalHours} onChange={(v) => setField("goalHours", v)} min={0} max={9} />
          <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>시간</span>
          <NumBox value={form.goalMinutes} onChange={(v) => setField("goalMinutes", v)} min={0} max={59} />
          <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>분</span>
        </div>
        {step1Errors.goalTime && (
          <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step1Errors.goalTime}</p>
        )}
      </div>

      <div>
        <div className="flex items-end gap-[2px] pb-1">
          <span className="font-medium text-[#0088FF]" style={{ fontSize: 15, lineHeight: "1.45" }}>{pbLabel}</span>
          <span className="font-medium text-black" style={{ fontSize: 15, lineHeight: "1.45" }}>최고 기록</span>
          <span className="font-medium text-[#727272]" style={{ fontSize: 15, lineHeight: "1.45" }}>(선택)</span>
        </div>
        <div className="flex items-center gap-[6px]">
          <NumBox value={form.pbHours} onChange={(v) => setField("pbHours", v)} min={0} max={9} disabled={form.noPb} />
          <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>시간</span>
          <NumBox value={form.pbMinutes} onChange={(v) => setField("pbMinutes", v)} min={0} max={59} disabled={form.noPb} />
          <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>분</span>
          <NumBox value={form.pbSeconds} onChange={(v) => setField("pbSeconds", v)} min={0} max={59} disabled={form.noPb} />
          <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>초</span>
        </div>
      </div>
    </div>
  );
}

export function Step2({
  form,
  setField,
  step2Errors,
  setStep2Errors,
}: {
  form: RunnerFormData;
  setField: SetField;
  step2Errors: { age?: string };
  setStep2Errors: Dispatch<SetStateAction<{ age?: string }>>;
}) {
  return (
    <div className="px-5 pb-4 flex flex-col gap-5" style={{ paddingTop: 16 }}>
      <div>
        <FieldLabel label="성별" required />
        <div className="flex gap-4">
          <Chip label="남자" selected={form.gender === "male"} onClick={() => setField("gender", "male")} flex size="m" />
          <Chip label="여자" selected={form.gender === "female"} onClick={() => setField("gender", "female")} flex size="m" />
        </div>
      </div>

      <div>
        <FieldLabel label="나이" required />
        <div className="flex items-center gap-[6px]">
          <NumBox
            value={form.age}
            onChange={(v) => { setField("age", v); setStep2Errors((e) => ({ ...e, age: undefined })); }}
            min={10}
            max={99}
          />
          <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>세</span>
        </div>
        {step2Errors.age && (
          <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step2Errors.age}</p>
        )}
      </div>

    </div>
  );
}

export function Step3({
  form,
  setField,
  step3Errors,
  setStep3Errors,
  toggleDay,
  toggleAllDays,
}: {
  form: RunnerFormData;
  setField: SetField;
  step3Errors: { trainingDays?: string; joggingHr?: string; runningHr?: string };
  setStep3Errors: Dispatch<SetStateAction<{ trainingDays?: string; joggingHr?: string; runningHr?: string }>>;
  toggleDay: (day: string) => void;
  toggleAllDays: () => void;
}) {
  return (
    <div className="px-5 pb-4 flex flex-col gap-[40px]" style={{ paddingTop: 16 }}>
      <div className="flex flex-col gap-[10px]">
        <SectionTitle title="마일리지" />
        <div className="flex flex-col gap-5">
          <div>
            <FieldLabel label="최근 1주" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.weeklyMileage1} onChange={(v) => setField("weeklyMileage1", v)} min={0} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
            </div>
          </div>

          <div>
            <FieldLabel label="최근 1달" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.weeklyMileage4} onChange={(v) => setField("weeklyMileage4", v)} min={0} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
            </div>
          </div>

          <div>
            <FieldLabel label="최근 LSD" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.maxRunDistance} onChange={(v) => setField("maxRunDistance", v)} min={0} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between pb-1">
              <span className="font-medium text-black" style={{ fontSize: 15, lineHeight: "1.45" }}>
                훈련 가능 요일
              </span>
              <button
                type="button"
                onClick={toggleAllDays}
                className="font-medium text-[#0088FF]"
                style={{ fontSize: 13 }}
              >
                {form.trainingDays.length === 7 ? "전체 해제" : "모두 선택"}
              </button>
            </div>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => { toggleDay(d.value); setStep3Errors((e) => ({ ...e, trainingDays: undefined })); }}
                  className={cn(
                    "flex-1 rounded-full border font-semibold transition-colors py-1.5 text-[14px]",
                    form.trainingDays.includes(d.value)
                      ? "border-[#0088FF] text-[#0088FF]"
                      : "border-[#5E6368] text-black"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {step3Errors.trainingDays && (
              <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step3Errors.trainingDays}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[10px]">
        <SectionTitle title="조깅" sub="평소 조깅 1회 기준으로 입력해 주세요." />
        <div className="flex flex-col gap-5">
          <div>
            <FieldLabel label="거리" sub="(km)" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.joggingDist} onChange={(v) => setField("joggingDist", v)} min={0} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
            </div>
          </div>

          <div>
            <FieldLabel label="페이스" sub="(min/km)" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.joggingPaceMin} onChange={(v) => setField("joggingPaceMin", v)} min={3} max={20} />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>분</span>
              <NumBox value={form.joggingPaceSec} onChange={(v) => setField("joggingPaceSec", v)} min={0} max={59} />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>초</span>
            </div>
          </div>

          <div>
            <FieldLabel label="심박" sub="(bpm)" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.joggingHr} onChange={(v) => { setField("joggingHr", v); setStep3Errors((e) => ({ ...e, joggingHr: undefined })); }} min={60} max={200} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>bpm</span>
            </div>
            {step3Errors.joggingHr && (
              <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step3Errors.joggingHr}</p>
            )}
          </div>

          <div>
            <FieldLabel label="케이던스" sub="(선택, spm)" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.joggingCadence ?? 0} onChange={(v) => setField("joggingCadence", v || null)} min={100} max={220} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>spm</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[10px] pb-2">
        <SectionTitle title="러닝" sub="평소 러닝 1회 기준으로 입력해 주세요." />
        <div className="flex flex-col gap-5">
          <div>
            <FieldLabel label="거리" sub="(km)" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.runningDist} onChange={(v) => setField("runningDist", v)} min={0} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>km</span>
            </div>
          </div>

          <div>
            <FieldLabel label="페이스" sub="(min/km)" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.runningPaceMin} onChange={(v) => setField("runningPaceMin", v)} min={3} max={20} />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>분</span>
              <NumBox value={form.runningPaceSec} onChange={(v) => setField("runningPaceSec", v)} min={0} max={59} />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>초</span>
            </div>
          </div>

          <div>
            <FieldLabel label="심박" sub="(bpm)" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.runningHr} onChange={(v) => { setField("runningHr", v); setStep3Errors((e) => ({ ...e, runningHr: undefined })); }} min={60} max={220} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>bpm</span>
            </div>
            {step3Errors.runningHr && (
              <p style={{ fontSize: 13, color: "#FC6C6C", marginTop: 4 }}>{step3Errors.runningHr}</p>
            )}
          </div>

          <div>
            <FieldLabel label="케이던스" sub="(선택, spm)" />
            <div className="flex items-center gap-[6px]">
              <NumBox value={form.runningCadence ?? 0} onChange={(v) => setField("runningCadence", v || null)} min={100} max={220} wide />
              <span className="font-medium text-black" style={{ fontSize: 16, lineHeight: "1.45" }}>spm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingForm({
  formStep,
  form,
  setField,
  step1Errors,
  step2Errors,
  step3Errors,
  setStep2Errors,
  setStep3Errors,
  calendarOpen,
  setCalendarOpen,
  minDate,
  maxDate,
  pbLabel,
  toggleDay,
  toggleAllDays,
  error,
  handleNext,
  isSubmitting,
}: {
  formStep: 1 | 2 | 3;
  form: RunnerFormData;
  setField: SetField;
  step1Errors: { raceDate?: string; raceType?: string; goalTime?: string };
  step2Errors: { age?: string };
  step3Errors: { trainingDays?: string; joggingHr?: string; runningHr?: string };
  setStep2Errors: Dispatch<SetStateAction<{ age?: string }>>;
  setStep3Errors: Dispatch<SetStateAction<{ trainingDays?: string; joggingHr?: string; runningHr?: string }>>;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  minDate: Date;
  maxDate: Date;
  pbLabel: string;
  toggleDay: (day: string) => void;
  toggleAllDays: () => void;
  error: string | null;
  handleNext: () => void;
  isSubmitting: boolean;
}) {
  return (
    <main className="flex flex-col min-h-screen max-w-[320px] mx-auto bg-white" style={{ paddingTop: 16 }}>
      <ProgressBar step={formStep} />

      <div className="p-5 shrink-0">
        <h1
          className="font-semibold text-black whitespace-pre-line"
          style={{ fontSize: 28, lineHeight: 1.30, letterSpacing: "-0.0054em" }}
        >
          {formStep === 1 && "달성하고 싶은\n목표를 알려주세요"}
          {formStep === 2 && "기본 정보를\n입력해 주세요"}
          {formStep === 3 && "러닝 정보를\n입력해 주세요"}
        </h1>
        {formStep === 3 && (
          <p
            className="font-medium text-[#5E6368] mt-2"
            style={{ fontSize: 14, lineHeight: "1.40" }}
          >
            AI 코치가 분석 후 훈련 계획을 알려줘요.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {formStep === 1 && (
          <Step1
            form={form}
            setField={setField}
            step1Errors={step1Errors}
            calendarOpen={calendarOpen}
            setCalendarOpen={setCalendarOpen}
            minDate={minDate}
            maxDate={maxDate}
            pbLabel={pbLabel}
          />
        )}
        {formStep === 2 && (
          <Step2
            form={form}
            setField={setField}
            step2Errors={step2Errors}
            setStep2Errors={setStep2Errors}
          />
        )}
        {formStep === 3 && (
          <Step3
            form={form}
            setField={setField}
            step3Errors={step3Errors}
            setStep3Errors={setStep3Errors}
            toggleDay={toggleDay}
            toggleAllDays={toggleAllDays}
          />
        )}
      </div>

      <div className="py-5 shrink-0">
        {error && (
          <p className="text-[#FC6C6C] mb-3 text-center" style={{ fontSize: 13 }}>{error}</p>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={formStep === 3 && isSubmitting}
          className="w-[320px] bg-[#0088FF] text-white rounded-xl font-semibold active:opacity-90 transition-opacity disabled:opacity-50"
          style={{ paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, fontSize: 18, lineHeight: "1.40", borderRadius: 12 }}
        >
          다음
        </button>
      </div>
    </main>
  );
}
