'use client'
import indicatorData from "./data/allIndicatorData.json";
import themeData from "./data/allThemes.json"
import allData from "./data/allData.json"
import countryData from "./data/population.json";
import countryGeoJson from "./data/boundaryGeojson.json";

import * as d3 from "d3";
import {DataEntry, DataResult, FormattedData, Indicator, Target, TimeData} from "@/types";
import React from "react";
import ThemesPanel from "@/app/components/ThemesPanel";
import MapPanel from "@/app/components/MapPanel";
import DataPanel from "@/app/components/DataPanel";
import TargetPanel from "@/app/components/TargetPanel";

export default  function Home() {


    const getTargetScale = (target: Target) => {
        if(target.needsAttention > target.stretch){
            return  d3
                .scaleThreshold<number, string>()
                .domain([target.stretch, target.target, target.needsAttention])
                .range(["overStretch", "nearStretch", "nearTarget", "needsAttention"]);
        }
        return   d3
            .scaleThreshold<number, string>()
            .domain([target.needsAttention, target.target, target.stretch])
            .range(["needsAttention", "nearTarget", "nearStretch", "overStretch"]);
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
                    data: indicatorType === "time" ? timeData : timeData.length === 0 ? "unknown" : timeData[timeData.length - 1].value,
                    targetResult: timeData.length === 0 ? "unknown" : targetScale(timeData[timeData.length - 1].value)
                })
            } else if (indicatorType === "YN"){
                acc.push({
                    country: entry[0],
                    data: timeData.some((s) => +s.value === 1) ? "Y" : "N",
                    targetResult: timeData.some((s) => +s.value === 1) ? "Y" : "N",
                })
            }
            return acc;
        }, [] as DataResult[])
    }
    const formatData = (indicatorData: Indicator[], allData: DataEntry[]) => {

        const typeGroups: { [key: string]:string [] |  number[]} = {"SEX": ["M","F"], "URBANIZATION" :["U","R"]}
        const basicDataTypes = ["time","%","#", "YN"];

        return indicatorData.reduce((indicatorAcc, indicator) => {
            if(indicator.type === "INVALID"){
                indicatorAcc.push({
                    indicator: indicator.indicator,
                    type: indicator.type,
                    data:[]
                })
            } else {
                const matchingData = allData.filter((f) => f.indicator === indicator.indicator);
                if(basicDataTypes.includes(indicator.type)){
                    indicatorAcc.push({
                        indicator: indicator.indicator,
                        type: indicator.type,
                        data:getDataResults(indicator.type, indicator.targets, matchingData)
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
                        indicatorAcc.push({
                            indicator: `${indicator.indicator}-${d}`,
                            type: indicator.type,
                            data:getDataResults(actualType, targets, groupData)
                        })
                    })
                }



            }

            return indicatorAcc;
        }, [] as FormattedData[])
    }

    const chartData  = formatData(indicatorData,allData);


  return (
      <><div className="w-screen h-screen bg-gray-100 flex flex-col">
          <div className="flex h-[35vh] w-full">
              <div className="w-1/4 flex flex-col">
                  <div className="h-1/2"><img src="/BP2050-Logo.png" alt="BP2050 Logo"  className="w-full h-full object-contain"/></div>
                  <div className="h-1/2 bg-white"><ThemesPanel themeData={themeData}></ThemesPanel></div>
              </div>
              <div className="w-3/4 bg-white"><MapPanel countryData={countryData} countryGeoJson={countryGeoJson}></MapPanel></div>
          </div>
          <div className="flex h-[65vh] w-full">
              <div className="w-1/2 h-full flex flex-col bg-white"><DataPanel chartData={chartData}></DataPanel></div>
              <div className="w-1/2 h-full flex flex-col bg-white"><TargetPanel chartData={chartData}></TargetPanel></div>
          </div>
      </div>
     </>

  );
}
