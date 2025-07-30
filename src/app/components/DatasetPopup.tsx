import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FormattedData } from '@/types';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: FormattedData | undefined;
}

const DatasetPopup: React.FC<ModalProps> = ({ isOpen, onClose, data }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current || !isOpen) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Your D3 code here
        svg.append("circle")
            .attr("cx", 50)
            .attr("cy", 50)
            .attr("r", 30)
            .attr("fill", "steelblue");
    }, [isOpen, data]);

    return (
        <div
            className={`modal-overlay ${isOpen ? '' : 'hidden'}`}
            onClick={onClose}
        >
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <svg ref={svgRef} width={400} height={300}>
                    <text className="title" x={10} y={20}>
                        Hello I'm a title
                    </text>
                </svg>
            </div>
        </div>
    );
};

export default DatasetPopup;
