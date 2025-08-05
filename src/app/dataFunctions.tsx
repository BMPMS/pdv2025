import {
    CountryStatus,
    DataEntry,
    DataResult,
    FormattedData,
    Indicator,
    ProgressDataEntry,
    Target,
    TimeData
} from "@/types";
import * as d3 from "d3";
import themeData from "@/app/data/allThemes.json";
import {iso3ToIso2Map} from "@/app/components/MapPanel_functions";

const generateTaperingArray = (startValue: number) =>  {
    const length = 26;
    const result: number[] = [startValue];
    let current = startValue;

    for (let i = 1; i < length; i++) {
        if (current === 0) {
            result.push(0);
            continue;
        }

        // Randomly choose a drop, skewed toward smaller drops early
        const maxDrop = Math.min(current, Math.ceil(startValue / (length - i)));
        const drop = Math.floor(Math.random() * (maxDrop + 1));

        current -= drop;
        result.push(current);
    }

    // Ensure last value is exactly 0
    result[length - 1] = 0;

    return result;
}

function generateUnevenSteps(start: number, end: number) {
    const a = Math.random();
    const b = Math.random();
    const [f1, f2] = [a, b].sort();

    return [
        start,
        Math.round(start + (end - start) * f1),
        Math.round(start + (end - start) * f2)
    ];
}

const generateProgressData = (baseEntry: ProgressDataEntry) => {
    baseEntry.year = 2025;
    const otherValues = ["needsAttention","nearTarget","onTarget","overStretch"]
    otherValues.forEach((d) => {
        if(!baseEntry[d as keyof typeof baseEntry]){
            baseEntry[d as keyof typeof baseEntry] = 0;
        }
    })
    const missingArray = generateTaperingArray(baseEntry.missing);
    const years = Array.from({ length: 26 }, (_, i) => 2025 + i);

    let previousEntry = baseEntry;

    const totalToShift = baseEntry.needsAttention + baseEntry.nearTarget;
    const averageShift = parseInt(String(totalToShift/12)) ;
    const shiftVars = ["needsAttention","nearTarget"];
    const newVars = ["onTarget","overStretch"]
    const dataFrom2025 = years.reduce((acc, entry,index) => {
        if(entry === 2025) {
            acc.push(previousEntry);
        } else {
           const newEntry = {
               year: entry,
               missing: missingArray[index],
               needsAttention: previousEntry.needsAttention,
               nearTarget: previousEntry.nearTarget,
               onTarget: previousEntry.onTarget,
               overStretch: previousEntry.overStretch
           }
           const difference = previousEntry.missing - newEntry.missing;
           // compensate for reduction in missing
           for(let i = difference; i > 0; i--){
               const newValueIndex = Math.floor(Math.random() * 4);
               newEntry[otherValues[newValueIndex as keyof typeof otherValues] as keyof typeof newEntry] += 1;
           }
            for(let i = averageShift; i > 0; i--){
                const shiftValueIndex = Math.floor(Math.random() * 2);
                const newValueIndex =  Math.random() < 0.8 ? 0 : 1;
                const shiftVar = shiftVars[shiftValueIndex as keyof typeof shiftVars];
                if(newEntry[shiftVar as keyof typeof newEntry] !== 0){
                    newEntry[shiftVar as keyof typeof newEntry] -= 1;
                    newEntry[newVars[newValueIndex as keyof typeof newVars] as keyof typeof newEntry] += 1;
                }
            }
            acc.push(newEntry);
            previousEntry = newEntry;
        }
        return acc;
    },[] as ProgressDataEntry[]);

    const previousDataStart = d3.sum(otherValues, (s) => baseEntry[s as keyof typeof baseEntry]) === 0
        ? baseEntry.missing : parseInt(String(baseEntry.missing * 2));

    const previousDataMissing = generateUnevenSteps(previousDataStart,baseEntry.missing);


    let startYear = 2022;
    previousDataMissing.forEach((d) => {
        const newEntry = {
            year: startYear,
            missing: d,
            needsAttention: baseEntry.needsAttention,
            nearTarget: baseEntry.nearTarget,
            onTarget: baseEntry.onTarget,
            overStretch: baseEntry.overStretch
        }
        const difference = parseInt(String((d - baseEntry.missing)/4));
        for(let i = difference; i > 0; i--){
            const newValueIndex = Math.floor(Math.random() * 4);
            newEntry[otherValues[newValueIndex as keyof typeof otherValues] as keyof typeof newEntry] -= 1;
        }
        dataFrom2025.push(newEntry)
        startYear += 1
    })
    return dataFrom2025.sort((a,b) => d3.ascending(a.year, b.year));

}

export const getProgressData = (
    allProgressData: ProgressDataEntry[],
    currentTheme: number,
    currentCountryOrRegion: string,
    currentChartData: FormattedData[],
    totalCountries: number,
    countryMapper: {[key: string]: string[]}
    ) => {
    // apologies - bad code, will correct, rushing for deadline!
    if(currentTheme !== -1 || currentCountryOrRegion !== "|"){
        const noInvalidData = currentChartData.filter((f) => f.type !== "INVALID");
        const flatData = noInvalidData.map((m) => m.data.flat()).flat();
        const notMissing = Array.from(d3.group(flatData, (g) => g.targetResult)).reduce((acc, entry) => {
            acc[entry[0]] = entry[1].length
            return acc;
        },{} as {[key: string] : number});
        let countryCount = totalCountries;
        if(currentCountryOrRegion !== "|") {
            const countrySplit = currentCountryOrRegion.split("|");
            const splitType = countrySplit[1];
            if(splitType && splitType === "Country"){
                countryCount = 1;
            }
            if(splitType && splitType === "Region" ){
                countryCount = countryMapper[countrySplit[0]].length;
            }
        }
        const totalDatasets = countryCount * noInvalidData.length;
        const sumNoMissing = flatData.length;
        notMissing["missing"] = totalDatasets - sumNoMissing;
        return generateProgressData(notMissing as ProgressDataEntry);
    }
    return allProgressData;
}
export const getFilteredChartData = (
    selectedTheme: number,
    selectedCountryOrRegion: string,
    allChartData: FormattedData[],
    countryMapper: {[key: string] : string[]}) => {
    // first filter the indicators by theme if needed
    const matchingTheme = themeData.find((f) => f.index === selectedTheme);
    const filteredIndicators = matchingTheme ?
        allChartData.filter((f) => matchingTheme.indicators.includes(f.indicator))
        : allChartData;
    const [filterVar, filterType] = selectedCountryOrRegion.split("|");
    const filterCountries = filterType === "Region" ? countryMapper[filterVar] : [iso3ToIso2Map[filterVar]];


    return filteredIndicators.reduce((acc, entry) => {
        const filteredData = entry.data.filter((f) => filterCountries.includes(f.country));
        const indicatorData = selectedCountryOrRegion === "|" ? entry.data : filteredData;
        acc.push({
            countryFilter: filterType === "Country" ? filterVar : "multiple",
            indicator: entry.indicator,
            indicatorName: entry.indicatorName,
            targets: entry.targets,
            type: entry.type,
            countryStatus: entry.countryStatus,
            data: indicatorData
        })
        return acc;
    }, [] as FormattedData[])
}
export const getRem = () => parseFloat(getComputedStyle(document.documentElement).fontSize)
const getTargetScale = (target: Target) => {
    if(target.needsAttention > target.stretch){
        return  d3
            .scaleThreshold<number, string>()
            .domain([target.stretch, target.target, target.needsAttention])
            .range(["overStretch", "onTarget", "nearTarget", "needsAttention"]);
    }
    return   d3
        .scaleThreshold<number, string>()
        .domain([target.needsAttention, target.target, target.stretch])
        .range(["needsAttention", "nearTarget", "onTarget", "overStretch"]);
}
const getDataResults = (indicatorType: string, targets: Target, matchingData: DataEntry[]) => {
    const byCountry = Array.from(d3.group(matchingData, (g) => g.iso2));
    return byCountry.reduce((acc,entry) => {
        const timeData = entry[1].reduce((dataAcc, dataEntry) => {
            if(typeof  dataEntry.VALUE === "number"){
                dataAcc.push({
                    year: dataEntry.TIME_PERIOD,
                    value: dataEntry.VALUE
                })
            }
            return dataAcc;
        },[] as TimeData[])
            .sort((a,b) => d3.ascending(a.year, b.year));
        if(indicatorType === "time" || indicatorType === "%" || indicatorType === "#"){
            const targetScale = getTargetScale(targets);
            acc.push({
                country: entry[0],
                data: indicatorType === "time" ? timeData : timeData.length === 0 ? "missing" : timeData[timeData.length - 1].value,
                targetResult: timeData.length === 0 ? "missing" : targetScale(timeData[timeData.length - 1].value)
            })
        } else if (indicatorType === "YN"){
            acc.push({
                country: entry[0],
                data: timeData.some((s) => +s.value === 1) ? "onTarget" : "needsAttention",
                targetResult: timeData.some((s) => +s.value === 1) ? "onTarget" : "needsAttention",
            })
        }
        return acc;
    }, [] as DataResult[])
}
const getCountryStatus = (currentData: DataResult[],allCountryCodes: string[]) => {
    return   allCountryCodes.reduce((acc, entry) => {
        const matchingData =currentData.find((f) => f.country === entry);
        if(matchingData){
            acc.push({ISOCode: entry, status: matchingData.targetResult})
        } else {
            acc.push({ISOCode: entry, status: "missing"})
        }
        return acc;
    },[] as  CountryStatus[])
}
export const formatData = (indicatorData: Indicator[], allData: DataEntry[], allCountryCodes: string[]) => {

    const typeGroups: { [key: string]:string [] |  number[]} = {"SEX": ["M","F"], "URBANIZATION" :["U","R"]}
    const basicDataTypes = ["time","%","#", "YN"];



    return indicatorData.reduce((indicatorAcc, indicator) => {
        if(indicator.type === "INVALID"){
            indicatorAcc.push({
                countryFilter: "multiple",
                indicator: indicator.indicator,
                indicatorName: indicator.indicatorName,
                targets: indicator.targets,
                type: indicator.type,
                countryStatus: [],
                data:[]
            })
        } else {
            const matchingData = allData.filter((f) => f.indicator === indicator.indicator);
            if(basicDataTypes.includes(indicator.type)){
                const indicatorData = getDataResults(indicator.type, indicator.targets, matchingData);
                indicatorAcc.push({
                    countryFilter: "multiple",
                    indicator: indicator.indicator,
                    indicatorName: indicator.indicatorName,
                    targets:indicator.targets,
                    type: indicator.type,
                    countryStatus: getCountryStatus(indicatorData,allCountryCodes),
                    data:indicatorData
                })
            } else {
                const splitType = indicator.type.split("_");
                const actualType = splitType[0];
                const dataType = splitType.slice(1).join("_");
                let dataGroups = typeGroups[dataType];
                if(!dataGroups) {
                    if(dataType === "EDUCATION"){
                        if(Object.keys(indicator.targets).includes("needsAttention")){
                            dataGroups = [1,2,3];
                        } else {
                            dataGroups = Object.keys(indicator.targets);
                            // terrible cheat
                            matchingData.map((m) => m.EDUCATION = String(m.EDUCATION));
                        }
                    } else {
                        if(Object.keys(indicator.targets).includes("needsAttention")){
                            console.error ('issue here');
                        } else {
                            dataGroups = Object.keys(indicator.targets)
                        }
                    }

                }
                dataGroups.forEach((d) => {
                    const groupData = matchingData.filter((f) => f[dataType as keyof DataEntry] === d);
                    const targets = indicator.targets[d] ? indicator.targets[d] : indicator.targets;
                    const indicatorData = getDataResults(actualType, targets, groupData);
                    indicatorAcc.push({
                        countryFilter: "multiple",
                        indicator: `${indicator.indicator}-${d}`,
                        indicatorName: indicator.indicatorName,
                        targets,
                        type: indicator.type,
                        countryStatus: getCountryStatus(indicatorData,allCountryCodes),
                        data:indicatorData
                    })
                })
            }
        }

        return indicatorAcc;
    }, [] as FormattedData[])
}
