'use client'
import indicatorData from "./data/allIndicatorData.json";
import themeData from "./data/allThemes.json"
import allData from "./data/allData.json"
import countryData from "./data/population.json";
import countryGeoJson from "./data/boundaryGeojson.json";
import {DataEntry, EEZGeoJSON, FormattedData} from "@/types";
import React, {useRef, useState} from "react";
import ThemesPanel from "@/app/components/ThemesPanel";
import MapPanel from "@/app/components/MapPanel";
import DataPanel from "@/app/components/DataPanel";
import {formatData, getFilteredChartData} from "@/app/dataFunctions"


export default  function Home() {

    const allChartData = formatData(indicatorData,allData as DataEntry[]);
    const [chartData, setChartData] = useState<FormattedData[]>(allChartData);
    const selectedTheme: React.RefObject<number>  = useRef(-1);
    const selectedCountryOrRegion: React.RefObject<string>  = useRef("|");


    const regionSet = [...new Set(countryData.map((m) => m.Region))];
    const countryMapper = regionSet.reduce((acc, entry) => {
        acc[entry] = countryData
            .filter((f) => f.Region === entry)
            .map((m) => m.ISOCode);
        return acc;
    },{} as {[key: string]: string[]});


    const filterByTheme = (themeIndex: number) => {
        selectedTheme.current = themeIndex;
        const newChartData = getFilteredChartData(
            selectedTheme.current,
            selectedCountryOrRegion.current,
            allChartData,
            countryMapper
        );
        setChartData(newChartData);
    }

    const filterByCountryOrRegion = (filterVar: string, filterType: string) => {

        selectedCountryOrRegion.current = `${filterVar}|${filterType}`;
        const newChartData = getFilteredChartData(
            selectedTheme.current,
            selectedCountryOrRegion.current,
            allChartData,
            countryMapper
        );
        setChartData(newChartData);
    }

  return (
      <><div className="w-screen h-screen  bg-white flex flex-col">
          <div className="flex h-[min(30vh,25vw)] w-full">
              <div className="w-1/3 flex flex-col">
                  <div className="h-1/2  p-4"><img src="/BP2050-Logo.png" alt="BP2050 Logo"  className=" w-full h-full object-left object-contain"/></div>
                  <div className="h-1/2 bg-white"><ThemesPanel themeData={themeData} filterByTheme={filterByTheme}></ThemesPanel></div>
              </div>
              <div className="w-2/3 bg-white"><MapPanel countryData={countryData} filterByCountryOrRegion={filterByCountryOrRegion} countryGeoJson={countryGeoJson as EEZGeoJSON}></MapPanel></div>
          </div>
          <div className="flex h-[calc(100vh_-_min(30vh,_25vw))] w-full">
              <div className="w-full h-full flex flex-col bg-white"><DataPanel chartData={chartData}></DataPanel></div>
          </div>
      </div>
     </>

  );
}
