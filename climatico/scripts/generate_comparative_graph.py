from plotly.graph_objects import Figure, Bar
import json
import os
import datetime

def generate_comparative_graph(freight_options, output_dir="graphs"):
    """
    Generate an SVG bar chart comparing freight options and save to a file.

    Args:
        freight_options: List of dicts with type, kgCO2e, cost_usd
        output_dir: Directory to save output
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Create bar chart
    fig = Figure(
        data=[
            Bar(
                name='kgCO2e',
                x=[opt['type'] for opt in freight_options],
                y=[opt['kgCO2e'] for opt in freight_options],
                marker_color=['red', 'orange', 'green'],
                hovertemplate='&lt;b&gt;Type: %{x}&lt;/b&gt;\n&lt;b&gt;CO2e: %{y:,} kg&lt;/b&gt;\nCost: $%{customdata[0]:,.0f}'
            )
        ]
    )
    
    # Update layout
    fig.update_layout(
        title='Carbon Impact Comparison: Freight Options (SJC to SF)',
        xaxis_title='Transport Method',
        yaxis_title='CO2e (kg)'
    )
    
    # Add comparison annotation
    best_option = min(freight_options, key=lambda x: x['kgCO2e'])
    fig.add_annotation(
        x=best_option['type'],
        y=best_option['kgCO2e'],
        text=f'Recommended: {best_option["kgCO2e"]:,} kg',
        showarrow=True,
        arrowhead=2,
        font=dict(color='green'),
        yshift=10
    )
    
    # Add savings text
    air_option = next(opt for opt in freight_options if opt['type'] == 'Air')
    savings = air_option['kgCO2e'] - best_option['kgCO2e']
    fig.add_annotation(
        x=air_option['type'],
        y=air_option['kgCO2e'],
        text=f'+{savings:,} kg saved by switching to {best_option["type"]}',
        showarrow=False,
        font=dict(size=10, color='green'),
        yshift=-10
    )
    
    # Generate filename
    filename = f"{output_dir}/impact-{datetime.date.today().strftime('%Y-%m-%d')}.svg"
    
    # Write SVG
    fig.write_image(filename)
    
    # Save metadata
    metadata = {
        "generated_at": datetime.datetime.now().isoformat(),
        "data": freight_options,
        "comparison": {
            "best": best_option['type'],
            "avoided": f"{savings:,} kgCO2e",
            "saving_ratio": f"{savings/air_option['kgCO2e']*100:.1f}%"
        }
    }
    
    with open(f"{filename}.meta.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Created graph: {filename}")
    print(f"Saved metadata: {filename}.meta.json")
    
    return filename, metadata

# Example usage
if __name__ == "__main__":
    freight_options = [
        {"type": "Air", "kgCO2e": 31000, "cost_usd": 12000},
        {"type": "Truck", "kgCO2e": 14000, "cost_usd": 8500},
        {"type": "Rail", "kgCO2e": 8000, "cost_usd": 9200}
    ]
    
    generate_comparative_graph(freight_options)
